import type { LifeCommand } from '../expansion/model.ts'
import type { Save } from '../game.ts'
export type GameCommand =
  | LifeCommand
  | { type: 'claim-special-friends' | 'refresh' | 'attendance' | 'dismiss-notice' }
  | { type: 'buy' | 'sell' | 'achievement'; id: string }
  | { type: 'use' | 'mission' | 'expedition'; id: string; friendId: string }
  | { type: 'care'; friendId: string; action: 'feed' | 'wash' | 'rest' | 'pet' }
  | {
      type: 'hold-start' | 'pet' | 'pet-special' | 'hold-cancel'
      friendId: string
      holdId: string
    }
  | { type: 'drop'; friendId: string; x: number; y: number; holdId: string }
  | { type: 'photo'; friendId: string; photo: string }
export type WorldRow = {
  id: string
  revision: number
  data: Save | null
  updated_at: string
}
export type Holds = Record<
  string,
  { id: string; user: string; at: number; rewarded?: boolean }
>
export type ServerWorld = WorldRow & { holds: Holds }
export type CommandResult = { row: WorldRow; message: string }
export type CloudGame = {
  row: WorldRow
  busy: boolean
  error: string
  send: (command: GameCommand) => Promise<void>
  retry: () => void
  logout: () => void
}
