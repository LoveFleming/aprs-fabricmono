import React, { createContext, useContext, useState } from "react";

export type ThemeId = "sunny" | "sky" | "cyan";

interface ThemeInfo {
    id: ThemeId;
    label: string;
    emoji: string;
    headerLabel: string;
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
    sunny: { id: "sunny", label: "陽光", emoji: "☀️", headerLabel: "☀️ My Factory" },
    sky:   { id: "sky",   label: "天藍", emoji: "🌤️", headerLabel: "🌤️ My Factory" },
    cyan:  { id: "cyan",  label: "青色", emoji: "🌊",  headerLabel: "🌊 My Factory" },
};

interface ThemeContextType {
    theme: ThemeId;
    info: ThemeInfo;
    setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "sunny",
    info: THEMES.sunny,
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeId] = useState<ThemeId>(() => {
        try { return (localStorage.getItem("ai-factory-theme") as ThemeId) || "sunny"; }
        catch { return "sunny"; }
    });

    const setTheme = (id: ThemeId) => {
        setThemeId(id);
        try { localStorage.setItem("ai-factory-theme", id); } catch {}
    };

    // Set data-theme on document
    React.useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, info: THEMES[theme], setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
