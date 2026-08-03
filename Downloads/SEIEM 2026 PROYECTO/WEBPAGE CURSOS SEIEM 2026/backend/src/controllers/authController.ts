import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { generateToken } from '../utils/jwt';
import { sendPasswordResetEmail, sendPasswordChangePinEmail } from '../services/emailService';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID');

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, name, role, email } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    if (!email) {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }
    
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        name,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      },
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, avatarUrl: user.avatarUrl, usernameChangeDates: user.usernameChangeDates },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const searchIdentifier = username.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: searchIdentifier, mode: 'insensitive' } },
          { email: { equals: searchIdentifier, mode: 'insensitive' } }
        ]
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, avatarUrl: user.avatarUrl, usernameChangeDates: user.usernameChangeDates },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ id: user.id, username: user.username, name: user.name, role: user.role, avatarUrl: user.avatarUrl, usernameChangeDates: user.usernameChangeDates });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword, pin } = req.body;
    if (!currentPassword || !newPassword || !pin) {
      return res.status(400).json({ error: 'Todos los campos (contraseña actual, nueva y PIN) son requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Validar el PIN de cambio
    if (!user.changePin || user.changePin !== pin) {
      return res.status(400).json({ error: 'El código PIN es incorrecto' });
    }

    if (!user.changePinExpires || new Date() > user.changePinExpires) {
      return res.status(400).json({ error: 'El código PIN ha expirado' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash,
        changePin: null,
        changePinExpires: null
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error changing password' });
  }
};

export const requestPasswordChangePin = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.email && !process.env.SMTP_USER) {
       // simulación
    } else if (!user.email) {
      return res.status(400).json({ error: 'El usuario no tiene un correo configurado. Contacta al administrador.' });
    }

    const pin = crypto.randomInt(100000, 999999).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        changePin: pin,
        changePinExpires: expires
      }
    });

    await sendPasswordChangePinEmail(user.email || 'simulated@local', user.username, pin);

    res.json({ message: 'Se ha enviado un PIN a tu correo para confirmar el cambio de contraseña.' });
  } catch (error) {
    console.error('Password change pin request error:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username or email is required' });

    const searchIdentifier = username.trim();

    // Look for user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: searchIdentifier, mode: 'insensitive' } },
          { email: { equals: searchIdentifier, mode: 'insensitive' } } // Also allow searching by email
        ]
      }
    });

    // To prevent username enumeration, always return success even if user not found,
    // but in this internal system, maybe it's fine to say "user not found" to help them.
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.email && !process.env.SMTP_USER) {
       // If SMTP is not set, we can simulate sending to console
    } else if (!user.email) {
      return res.status(400).json({ error: 'El usuario no tiene un correo configurado. Contacta al administrador.' });
    }

    // Generate 6-digit PIN securely
    const pin = crypto.randomInt(100000, 999999).toString();
    
    // Set expiry to 10 minutes from now
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    // Save PIN to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPin: pin,
        resetPinExpires: expires
      }
    });

    // Send email (asynchronous, we don't wait for it to block the response unless we want to handle failures)
    // Send to user.email, or if null (and we are in simulation mode), send to a dummy string
    await sendPasswordResetEmail(user.email || 'simulated@local', user.username, pin);

    res.json({ message: 'Si el usuario existe, se ha enviado un PIN de recuperación.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { username, pin, newPassword } = req.body;

    if (!username || !pin || !newPassword) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const searchIdentifier = username.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: searchIdentifier, mode: 'insensitive' } },
          { email: { equals: searchIdentifier, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'PIN o usuario incorrecto' });
    }

    // Check if PIN matches and has not expired
    if (!user.resetPin || user.resetPin !== pin) {
      return res.status(400).json({ error: 'El código PIN es incorrecto' });
    }

    if (!user.resetPinExpires || new Date() > user.resetPinExpires) {
      return res.status(400).json({ error: 'El código PIN ha expirado' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and ATOMICALLY clear the PIN to prevent Replay Attacks
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPin: null,
        resetPinExpires: null
      }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { avatarUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      avatarUrl: updatedUser.avatarUrl,
      usernameChangeDates: updatedUser.usernameChangeDates
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google Token' });
    }

    const { email, name, picture } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create a new user if they don't exist
      const randomPassword = require('crypto').randomBytes(16).toString('hex');
      const passwordHash = await require('bcrypt').hash(randomPassword, 10);
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let counter = 1;
      
      // Ensure unique username
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          username,
          email,
          name: name || username,
          passwordHash,
          role: 'USER',
          avatarUrl: picture,
        },
      });
    } else if (!user.avatarUrl && picture) {
      // Optional: update avatar if they didn't have one
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: picture }
      });
    }

    const jwtToken = generateToken(user.id, user.role);

    res.json({
      token: jwtToken,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, avatarUrl: user.avatarUrl, usernameChangeDates: user.usernameChangeDates },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Server error during Google login' });
  }
};

export const updateUsername = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { newUsername } = req.body;
    if (!newUsername) return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const existing = await prisma.user.findUnique({ where: { username: newUsername } });
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
    }

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const recentChanges = user.usernameChangeDates.filter(date => new Date(date) >= startOfWeek);

    if (recentChanges.length >= 2) {
      return res.status(400).json({ error: 'Has alcanzado el límite de 2 cambios de nombre por semana. Inténtalo la próxima semana.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        username: newUsername,
        usernameChangeDates: {
          push: new Date()
        }
      },
    });

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      avatarUrl: updatedUser.avatarUrl,
      usernameChangeDates: updatedUser.usernameChangeDates
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({ error: 'Server error updating username' });
  }
};
