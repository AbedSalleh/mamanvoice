import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.mamanvoice.app',
    appName: 'MamanVoice',
    webDir: 'dist/public',
    server: {
        androidScheme: 'https'
    }
};

export default config;
