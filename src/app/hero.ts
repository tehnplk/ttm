import { heroui } from "@heroui/theme";

// Tailwind v4 hero config used only at build time by Tailwind.
// We don't need strict TS typing here, and HeroUI's helper returns a plugin
// type that doesn't match Tailwind's `UserConfig` generics, which caused:
// "Type 'PluginWithConfig' has no properties in common with type 'UserConfig'."
// So we export a plain config object that Tailwind can consume without TS errors.
export default {
    presets: [
        heroui({
            defaultTheme: "light",
            themes: {
                light: {
                    colors: {
                        primary: {
                            50: '#faf5ff',
                            100: '#f3e8ff',
                            200: '#e9d5ff',
                            300: '#d8b4fe',
                            400: '#c084fc',
                            500: '#a855f7',
                            600: '#9333ea',
                            700: '#7e22ce',
                            800: '#6b21a8',
                            900: '#581c87',
                            DEFAULT: '#9333ea',
                            foreground: '#ffffff',
                        },
                    },
                },
            },
        }),
    ],
};



