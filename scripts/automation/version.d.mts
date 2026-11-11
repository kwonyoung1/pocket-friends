import type {Plugin} from 'vite'
export function versionPlugin():Plugin
export function buildVersion():{sha:string;builtAt:string}
