/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect, react/prop-types */
import React, { createContext, useContext, useState, useEffect } from 'react';
import ParticlesBackground from '../components/ParticlesBackground';

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  subText: string;
  primary: string;
  border: string;
  secondary: string;
  accent: string;
  shadow: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
};

export const baseThemes = [
  { id: 'mint', name: 'Mint' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'lavender', name: 'Lavender' },
  { id: 'frutigerAero', name: 'Glass Blue' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'nord', name: 'Nordic Ice' },
  { id: 'matcha', name: 'Matcha Tea' },
  { id: 'synthwave', name: 'Synthwave' },
  { id: 'midnight', name: 'Midnight (OLED)' },
  { id: 'ruby', name: 'Crimson Ruby' },
  { id: 'forest', name: 'Forest' },
  { id: 'amethyst', name: 'Amethyst' },
  { id: 'volcano', name: 'Volcano' },
  { id: 'coffee', name: 'Coffee' },
  { id: 'gold', name: 'Gold' },
  { id: 'neon', name: 'Neon' },
  { id: 'mono', name: 'Monochrome' },
];

export const themes: Record<string, ThemeDefinition> = {
  mintLight: { id: 'mintLight', name: 'Mint Claro', isDark: false, colors: { background: '#f2f7f4', card: '#ffffff', text: '#000000', subText: '#555555', border: '#e0e0e0', primary: '#2ab78e', secondary: '#9c66e4', accent: '#ff007f', shadow: '#000000' } },
  mintDark: { id: 'mintDark', name: 'Mint Oscuro', isDark: true, colors: { background: '#121212', card: '#1e1e1e', text: '#ffffff', subText: '#a0a0a0', border: '#2c2c2c', primary: '#30c296', secondary: '#b388eb', accent: '#ff007f', shadow: '#000000' } },
  cyberpunkLight: { id: 'cyberpunkLight', name: 'Cyberpunk Claro', isDark: false, colors: { background: '#f0e6f5', card: '#ffffff', text: '#d80073', subText: '#00a8cc', border: '#e6e6e6', primary: '#ff007f', secondary: '#00e5ff', accent: '#ffe600', shadow: '#ff007f' } },
  cyberpunkDark: { id: 'cyberpunkDark', name: 'Cyberpunk Oscuro', isDark: true, colors: { background: '#090117', card: '#150926', text: '#00ffcc', subText: '#ff007f', border: '#2b0052', primary: '#ff007f', secondary: '#00e5ff', accent: '#ffe600', shadow: '#ff007f' } },
  oceanLight: { id: 'oceanLight', name: 'Ocean Claro', isDark: false, colors: { background: '#e0f7fa', card: '#ffffff', text: '#004d40', subText: '#00796b', border: '#b2dfdb', primary: '#00acc1', secondary: '#4dd0e1', accent: '#00838f', shadow: '#000000' } },
  oceanDark: { id: 'oceanDark', name: 'Ocean Oscuro', isDark: true, colors: { background: '#05101f', card: '#0d1e36', text: '#e0f2fe', subText: '#7dd3fc', border: '#1e3a8a', primary: '#0ea5e9', secondary: '#38bdf8', accent: '#0284c7', shadow: '#000000' } },
  sunsetLight: { id: 'sunsetLight', name: 'Sunset Claro', isDark: false, colors: { background: '#fff3e0', card: '#ffffff', text: '#3e2723', subText: '#6d4c41', border: '#ffe0b2', primary: '#f57c00', secondary: '#ff7043', accent: '#e64a19', shadow: '#000000' } },
  sunsetDark: { id: 'sunsetDark', name: 'Sunset Oscuro', isDark: true, colors: { background: '#1c0c09', card: '#311611', text: '#ffedd5', subText: '#fdba74', border: '#5b2116', primary: '#ea580c', secondary: '#f97316', accent: '#c2410c', shadow: '#000000' } },
  lavenderLight: { id: 'lavenderLight', name: 'Lavanda Claro', isDark: false, colors: { background: '#f5f0fa', card: '#ffffff', text: '#3b2a4f', subText: '#6b5884', border: '#e6d9f2', primary: '#8b5fd6', secondary: '#b890eb', accent: '#ff7597', shadow: '#000000' } },
  lavenderDark: { id: 'lavenderDark', name: 'Lavanda Oscuro', isDark: true, colors: { background: '#130e1a', card: '#1f1629', text: '#f3e8ff', subText: '#c4b5fd', border: '#3b2f4f', primary: '#a855f7', secondary: '#c084fc', accent: '#f472b6', shadow: '#000000' } },
  frutigerAeroLight: { id: 'frutigerAeroLight', name: 'Frutiger Aero Claro', isDark: false, colors: { background: '#e0f7fa', card: 'rgba(255, 255, 255, 0.7)', text: '#004d40', subText: '#00796b', border: 'rgba(255, 255, 255, 0.8)', primary: '#00e5ff', secondary: '#69f0ae', accent: '#b2ebf2', shadow: '#000000' } },
  frutigerAeroDark: { id: 'frutigerAeroDark', name: 'Frutiger Aero Oscuro', isDark: true, colors: { background: '#001a1c', card: 'rgba(0, 30, 40, 0.6)', text: '#e0f7fa', subText: '#80cbc4', border: 'rgba(0, 229, 255, 0.3)', primary: '#00e5ff', secondary: '#00bfa5', accent: '#18ffff', shadow: '#000000' } },
  draculaLight: { id: 'draculaLight', name: 'Dracula Claro', isDark: false, colors: { background: '#f8f8f2', card: '#ffffff', text: '#282a36', subText: '#6272a4', border: '#e2e2dc', primary: '#ff79c6', secondary: '#bd93f9', accent: '#ffb86c', shadow: '#000000' } },
  draculaDark: { id: 'draculaDark', name: 'Dracula Oscuro', isDark: true, colors: { background: '#282a36', card: '#44475a', text: '#f8f8f2', subText: '#6272a4', border: '#3e4053', primary: '#ff79c6', secondary: '#bd93f9', accent: '#50fa7b', shadow: '#000000' } },
  nordLight: { id: 'nordLight', name: 'Nord Claro', isDark: false, colors: { background: '#eceff4', card: '#ffffff', text: '#2e3440', subText: '#4c566a', border: '#e5e9f0', primary: '#5e81ac', secondary: '#81a1c1', accent: '#88c0d0', shadow: '#000000' } },
  nordDark: { id: 'nordDark', name: 'Nord Oscuro', isDark: true, colors: { background: '#2e3440', card: '#3b4252', text: '#eceff4', subText: '#d8dee9', border: '#434c5e', primary: '#88c0d0', secondary: '#81a1c1', accent: '#a3be8c', shadow: '#000000' } },
  matchaLight: { id: 'matchaLight', name: 'Matcha Claro', isDark: false, colors: { background: '#f4f6f0', card: '#ffffff', text: '#3e4e3b', subText: '#7b8c76', border: '#e3e8de', primary: '#8da37b', secondary: '#a6b896', accent: '#c4d4b4', shadow: '#000000' } },
  matchaDark: { id: 'matchaDark', name: 'Matcha Oscuro', isDark: true, colors: { background: '#1c221a', card: '#252e23', text: '#e8ece6', subText: '#9ca998', border: '#2e382b', primary: '#8da37b', secondary: '#a6b896', accent: '#d2deb2', shadow: '#000000' } },
  synthwaveLight: { id: 'synthwaveLight', name: 'Synthwave Claro', isDark: false, colors: { background: '#fdf6e3', card: '#ffffff', text: '#2b213a', subText: '#685987', border: '#f0e6fa', primary: '#ff2a6d', secondary: '#05d9e8', accent: '#ffb200', shadow: '#ff2a6d' } },
  synthwaveDark: { id: 'synthwaveDark', name: 'Synthwave Oscuro', isDark: true, colors: { background: '#120422', card: '#1b0a33', text: '#05d9e8', subText: '#d1c1eb', border: '#33135c', primary: '#ff2a6d', secondary: '#05d9e8', accent: '#01ffe5', shadow: '#ff2a6d' } },
  midnightLight: { id: 'midnightLight', name: 'Midnight Claro', isDark: false, colors: { background: '#f8f9fa', card: '#ffffff', text: '#212529', subText: '#6c757d', border: '#e9ecef', primary: '#495057', secondary: '#adb5bd', accent: '#343a40', shadow: '#000000' } },
  midnightDark: { id: 'midnightDark', name: 'Midnight Oscuro (OLED)', isDark: true, colors: { background: '#000000', card: '#0a0a0a', text: '#f8f9fa', subText: '#868e96', border: '#1f1f1f', primary: '#e9ecef', secondary: '#adb5bd', accent: '#ffffff', shadow: '#000000' } },
  rubyLight: { id: 'rubyLight', name: 'Ruby Claro', isDark: false, colors: { background: '#fcf2f2', card: '#ffffff', text: '#4a151b', subText: '#8f4b53', border: '#f2d8da', primary: '#e63946', secondary: '#f4a261', accent: '#d90429', shadow: '#000000' } },
  rubyDark: { id: 'rubyDark', name: 'Ruby Oscuro', isDark: true, colors: { background: '#170608', card: '#2b0f13', text: '#ffe6e9', subText: '#b3777f', border: '#4d1e25', primary: '#e63946', secondary: '#f1faee', accent: '#ef233c', shadow: '#000000' } },
  forestLight: { id: 'forestLight', name: 'Forest Claro', isDark: false, colors: { background: '#eaf4e5', card: '#ffffff', text: '#1b3b22', subText: '#4c7052', border: '#c3dec7', primary: '#2d6a4f', secondary: '#52b788', accent: '#1b4332', shadow: '#000000' } },
  forestDark: { id: 'forestDark', name: 'Forest Oscuro', isDark: true, colors: { background: '#081c15', card: '#1b4332', text: '#d8f3dc', subText: '#74c69d', border: '#2d6a4f', primary: '#40916c', secondary: '#52b788', accent: '#95d5b2', shadow: '#000000' } },
  amethystLight: { id: 'amethystLight', name: 'Amethyst Claro', isDark: false, colors: { background: '#f4f0fa', card: '#ffffff', text: '#311b54', subText: '#684d94', border: '#d9c6f2', primary: '#7b2cbf', secondary: '#9d4edd', accent: '#c77dff', shadow: '#000000' } },
  amethystDark: { id: 'amethystDark', name: 'Amethyst Oscuro', isDark: true, colors: { background: '#10002b', card: '#240046', text: '#e0aaff', subText: '#c77dff', border: '#3c096c', primary: '#9d4edd', secondary: '#7b2cbf', accent: '#e0aaff', shadow: '#000000' } },
  volcanoLight: { id: 'volcanoLight', name: 'Volcano Claro', isDark: false, colors: { background: '#ffedea', card: '#ffffff', text: '#3a0c05', subText: '#872314', border: '#f7c3bc', primary: '#d00000', secondary: '#dc2f02', accent: '#9d0208', shadow: '#000000' } },
  volcanoDark: { id: 'volcanoDark', name: 'Volcano Oscuro', isDark: true, colors: { background: '#1c0303', card: '#370617', text: '#ffba08', subText: '#dc2f02', border: '#6a040f', primary: '#e85d04', secondary: '#f48c06', accent: '#ffba08', shadow: '#000000' } },
  coffeeLight: { id: 'coffeeLight', name: 'Coffee Claro', isDark: false, colors: { background: '#f5ebe0', card: '#ffffff', text: '#403d39', subText: '#7a6859', border: '#e3d5ca', primary: '#b08968', secondary: '#ddb892', accent: '#9c6644', shadow: '#000000' } },
  coffeeDark: { id: 'coffeeDark', name: 'Coffee Oscuro', isDark: true, colors: { background: '#211d1a', card: '#3a342e', text: '#eadecf', subText: '#a4988c', border: '#4a443e', primary: '#c9a27e', secondary: '#b08968', accent: '#7f5539', shadow: '#000000' } },
  goldLight: { id: 'goldLight', name: 'Gold Claro', isDark: false, colors: { background: '#fdfbf7', card: '#ffffff', text: '#453813', subText: '#8c7639', border: '#e8ddb7', primary: '#d4af37', secondary: '#e6c86a', accent: '#aa8c2c', shadow: '#000000' } },
  goldDark: { id: 'goldDark', name: 'Gold Oscuro', isDark: true, colors: { background: '#1c1912', card: '#2e2a1f', text: '#fcf3d7', subText: '#c2ae72', border: '#4a422a', primary: '#d4af37', secondary: '#f0db8e', accent: '#f7ebaf', shadow: '#000000' } },
  neonLight: { id: 'neonLight', name: 'Neon Claro', isDark: false, colors: { background: '#f0fdf4', card: '#ffffff', text: '#0f172a', subText: '#475569', border: '#bbf7d0', primary: '#22c55e', secondary: '#3b82f6', accent: '#ec4899', shadow: '#000000' } },
  neonDark: { id: 'neonDark', name: 'Neon Oscuro', isDark: true, colors: { background: '#020617', card: '#0f172a', text: '#f1f5f9', subText: '#94a3b8', border: '#1e293b', primary: '#39ff14', secondary: '#ff00ff', accent: '#00ffff', shadow: '#000000' } },
  monoLight: { id: 'monoLight', name: 'Mono Claro', isDark: false, colors: { background: '#ffffff', card: '#f5f5f5', text: '#000000', subText: '#666666', border: '#e0e0e0', primary: '#000000', secondary: '#333333', accent: '#999999', shadow: '#000000' } },
  monoDark: { id: 'monoDark', name: 'Mono Oscuro', isDark: true, colors: { background: '#000000', card: '#111111', text: '#ffffff', subText: '#aaaaaa', border: '#333333', primary: '#ffffff', secondary: '#cccccc', accent: '#666666', shadow: '#000000' } },
};

export type ParticleType = 'none' | 'snow' | 'bubbles' | 'stars';

type ThemeContextType = {
  themeFamily: string;
  setThemeFamily: (family: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
  particles: ParticleType;
  setParticles: (type: ParticleType) => void;
  themeId: string;
  backgroundImage: string | null;
  setBackgroundImage: (uri: string | null) => void;
  pickBackgroundImage: () => Promise<void>;
  customFont: string;
  setCustomFont: (font: string) => void;
  mascots: { id: string, url: string }[];
  addMascot: (url: string) => void;
  removeMascot: (id: string) => void;
  lyricsFontSize: number;
  setLyricsFontSize: (val: number) => void;
  showTranslatedLyrics: boolean;
  setShowTranslatedLyrics: (val: boolean) => void;
  lyricsLanguage: string;
  setLyricsLanguage: (lang: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  themeFamily: 'mint',
  setThemeFamily: () => { },
  isDarkMode: true,
  setIsDarkMode: () => { },
  toggleTheme: () => { },
  colors: themes.mintDark.colors,
  particles: 'none',
  setParticles: () => { },
  themeId: 'mintDark',
  backgroundImage: null,
  setBackgroundImage: () => { },
  pickBackgroundImage: async () => { },
  customFont: '',
  setCustomFont: () => { },
  mascots: [],
  addMascot: () => { },
  removeMascot: () => { },
  lyricsFontSize: 100,
  setLyricsFontSize: () => { },
  showTranslatedLyrics: false,
  setShowTranslatedLyrics: () => { },
  lyricsLanguage: 'es',
  setLyricsLanguage: () => { }
});

export const useTheme = (): ThemeContextType => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeFamily, setThemeFamilyState] = useState<string>('mint');
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(true);
  const [particles, setParticlesState] = useState<ParticleType>('none');
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null);
  const [customFont, setCustomFontState] = useState<string>('');
  const [mascots, setMascotsState] = useState<{ id: string, url: string }[]>([]);
  const [lyricsFontSize, setLyricsFontSizeState] = useState<number>(100);
  const [showTranslatedLyrics, setShowTranslatedLyricsState] = useState<boolean>(false);
  const [lyricsLanguage, setLyricsLanguageState] = useState<string>('es');

  useEffect(() => {
    const fam = localStorage.getItem('@theme_family');
    if (fam && baseThemes.find(t => t.id === fam)) setThemeFamilyState(fam);

    const dark = localStorage.getItem('@is_dark_mode');
    if (dark !== null) setIsDarkModeState(dark === 'true');

    const parts = localStorage.getItem('@particles') as ParticleType;
    if (parts) setParticlesState(parts);

    const bg = localStorage.getItem('@background_image');
    if (bg) setBackgroundImageState(bg);

    const font = localStorage.getItem('@custom_font');
    if (font) setCustomFontState(font);

    const savedMascots = localStorage.getItem('@mascots_list');
    if (savedMascots) {
      try {
        setMascotsState(JSON.parse(savedMascots));
      } catch (e) { }
    }

    const savedLyricsSize = localStorage.getItem('@lyrics_font_size');
    if (savedLyricsSize) {
      setLyricsFontSizeState(Number(savedLyricsSize));
    }

    const savedShowTranslation = localStorage.getItem('@show_translated_lyrics');
    if (savedShowTranslation !== null) {
      setShowTranslatedLyricsState(savedShowTranslation === 'true');
    }

    const savedLyricsLang = localStorage.getItem('@lyrics_language');
    if (savedLyricsLang) {
      setLyricsLanguageState(savedLyricsLang);
    }
  }, []);

  useEffect(() => {
    const linkId = 'google-fonts-custom';
    const styleId = 'google-fonts-custom-style';
    
    let link = document.getElementById(linkId) as HTMLLinkElement;
    let style = document.getElementById(styleId) as HTMLStyleElement;

    if (customFont) {
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${customFont.replace(/ /g, '+')}:wght@400;700;900&display=swap`;
      
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.innerHTML = `
        * {
          font-family: "${customFont}", sans-serif !important;
        }
      `;
    } else {
      if (style) {
        style.innerHTML = '';
      }
    }
  }, [customFont]);

  const setBackgroundImage = (uri: string | null): void => {
    setBackgroundImageState(uri);
    if (uri) localStorage.setItem('@background_image', uri);
    else localStorage.removeItem('@background_image');
  };

  const pickBackgroundImage = async (): Promise<void> => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setBackgroundImage(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const setThemeFamily = (family: string): void => {
    setThemeFamilyState(family);
    localStorage.setItem('@theme_family', family);
  };

  const setIsDarkMode = (dark: boolean): void => {
    setIsDarkModeState(dark);
    localStorage.setItem('@is_dark_mode', dark ? 'true' : 'false');
  };

  const setParticles = (type: ParticleType): void => {
    setParticlesState(type);
    localStorage.setItem('@particles', type);
  };

  const setCustomFont = (font: string): void => {
    setCustomFontState(font);
    localStorage.setItem('@custom_font', font);
  };

  const addMascot = (url: string): void => {
    setMascotsState(prev => {
      if (prev.length >= 3) return prev;
      const newMascots = [...prev, { id: Math.random().toString(36).substring(7), url }];
      localStorage.setItem('@mascots_list', JSON.stringify(newMascots));
      return newMascots;
    });
  };

  const removeMascot = (id: string): void => {
    setMascotsState(prev => {
      const newMascots = prev.filter(m => m.id !== id);
      localStorage.setItem('@mascots_list', JSON.stringify(newMascots));
      localStorage.removeItem(`@mascot_pos_${id}`);
      return newMascots;
    });
  };

  const setLyricsFontSize = (val: number): void => {
    setLyricsFontSizeState(val);
    localStorage.setItem('@lyrics_font_size', val.toString());
  };

  const setShowTranslatedLyrics = (val: boolean): void => {
    setShowTranslatedLyricsState(val);
    localStorage.setItem('@show_translated_lyrics', val ? 'true' : 'false');
  };

  const setLyricsLanguage = (lang: string): void => {
    setLyricsLanguageState(lang);
    localStorage.setItem('@lyrics_language', lang);
  };

  const toggleTheme = (): void => {
    setIsDarkMode(!isDarkMode);
  };

  const themeId = `${themeFamily}${isDarkMode ? 'Dark' : 'Light'}`;
  const currentTheme = themes[themeId] || themes.mintDark;
  const isFrutiger = themeFamily === 'frutigerAero';

  return (
    <ThemeContext.Provider value={{
      themeFamily, setThemeFamily, isDarkMode, setIsDarkMode, toggleTheme,
      colors: currentTheme.colors, particles, setParticles, themeId,
      backgroundImage, setBackgroundImage, pickBackgroundImage,
      customFont, setCustomFont, mascots, addMascot, removeMascot,
      lyricsFontSize, setLyricsFontSize, showTranslatedLyrics, setShowTranslatedLyrics,
      lyricsLanguage, setLyricsLanguage
    }}>
      <div style={{
        flex: 1,
        minHeight: '100vh',
        backgroundColor: currentTheme.colors.background,
        color: currentTheme.colors.text,
        position: 'relative'
      }}>
        {backgroundImage && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: isFrutiger ? 'blur(20px)' : 'none',
            zIndex: 0
          }} />
        )}
        {isFrutiger && !backgroundImage && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: isDarkMode
              ? 'linear-gradient(to bottom right, #001a1c, #004d40, #001a1c)'
              : 'linear-gradient(to bottom right, #e0f7fa, #b2ebf2, #80cbc4, #e0f7fa)',
            zIndex: 0
          }} />
        )}

        {particles !== 'none' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <ParticlesBackground type={particles} />
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          {children}
        </div>
      </div>
    </ThemeContext.Provider>
  );
};
