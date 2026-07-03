
    INSERT INTO "User" (id, username, email, name, role, "passwordHash", "createdAt", "updatedAt")
    VALUES ('ab1d2ebb-cba2-46d7-8a57-5d6ebc31cebb', 'admin', 'admin@seiem.mx', 'Administrador SEIEM', 'ADMIN', '$2b$10$uRbFFqrkAJB2HQdCpjdCl.0Mi7VuOWVUy2Kjx0DYE5EYNLkEVa01W', '2026-07-03T17:44:11.418Z', '2026-07-03T17:44:11.418Z')
    ON CONFLICT (username) DO UPDATE 
    SET "passwordHash" = '$2b$10$uRbFFqrkAJB2HQdCpjdCl.0Mi7VuOWVUy2Kjx0DYE5EYNLkEVa01W', role = 'ADMIN', email = 'admin@seiem.mx';
  