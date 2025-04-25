import { LogtoConfig } from '@logto/node';
import LogtoClient from '@logto/node';

export const logtoConfig: LogtoConfig = {
    endpoint: process.env.LOGTO_ENDPOINT || 'https://15jdfn.logto.app/',
    appId: process.env.LOGTO_APP_ID || 'ifous5fjeltb0j27mpntq',
    appSecret: process.env.LOGTO_APP_SECRET || 'LhYO70YlYOP5Z058SCvGgmXURvBF86Mj',
    scopes: [
        'openid', 
        'profile', 
        'email',
        'http://127.0.0.1:4000/read:resource',
        'http://127.0.0.1:4000/write:resource'
    ],
    resources: ['http://127.0.0.1:4000'],
};

// In-memory storage for session management
export const sessionStorage = new Map<string, { codeVerifier: string; accessToken?: string }>();

export const createLogtoClient = () => new LogtoClient(logtoConfig, {
    navigate: (url: string) => {
        console.log('Navigation requested to:', url);
    },
    storage: {
        getItem: async (key: string) => sessionStorage.get(key)?.codeVerifier || null,
        setItem: async (key: string, value: string) => {
            sessionStorage.set(key, { codeVerifier: value });
        },
        removeItem: async (key: string) => {
            sessionStorage.delete(key);
        }
    }
}); 