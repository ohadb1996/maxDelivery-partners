export const isDev = true; // Default to dev for now - will be replaced when Firebase is properly configured

export const isIOS = () => typeof navigator !== 'undefined' ? /iPhone|iPad|iPod/i.test(navigator.userAgent) : false;
