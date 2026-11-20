import {directionArt} from '../animation/assets'
// Approved plush A originals and newly authored poses; prepared by prepare-plush-art.mjs.
export type AnimalKind='cat'|'bunny'|'dog'|'bear'|'fox'|'hamster'
import momo_idle from '../assets/animals/plush-A/momo/idle.webp'
import momo_walk from '../assets/animals/plush-A/momo/walk-atlas.webp'
import momo_life from '../assets/animals/plush-A/momo/life-atlas.webp'
import bibi_idle from '../assets/animals/plush-A/bibi/idle.webp'
import bibi_walk from '../assets/animals/plush-A/bibi/walk-atlas.webp'
import bibi_life from '../assets/animals/plush-A/bibi/life-atlas.webp'
import coco_idle from '../assets/animals/plush-A/coco/idle.webp'
import coco_walk from '../assets/animals/plush-A/coco/walk-atlas.webp'
import coco_life from '../assets/animals/plush-A/coco/life-atlas.webp'
import dudu_idle from '../assets/animals/plush-A/dudu/idle.webp'
import dudu_walk from '../assets/animals/plush-A/dudu/walk-atlas.webp'
import dudu_life from '../assets/animals/plush-A/dudu/life-atlas.webp'
import lulu_idle from '../assets/animals/plush-A/lulu/idle.webp'
import lulu_walk from '../assets/animals/plush-A/lulu/walk-atlas.webp'
import lulu_life from '../assets/animals/plush-A/lulu/life-atlas.webp'
import toto_idle from '../assets/animals/plush-A/toto/idle.webp'
import toto_walk from '../assets/animals/plush-A/toto/walk-atlas.webp'
import toto_life from '../assets/animals/plush-A/toto/life-atlas.webp'
import byeol_idle from '../assets/animals/plush-A/byeol/idle.webp'
import byeol_walk from '../assets/animals/plush-A/byeol/walk-atlas.webp'
import byeol_life from '../assets/animals/plush-A/byeol/life-atlas.webp'
import mungchi_idle from '../assets/animals/plush-A/mungchi/idle.webp'
import mungchi_walk from '../assets/animals/plush-A/mungchi/walk-atlas.webp'
import mungchi_life from '../assets/animals/plush-A/mungchi/life-atlas.webp'
import hamster_idle from '../assets/animals/plush-A/hamster/idle.webp'
import hamster_walk from '../assets/animals/plush-A/hamster/walk-atlas.webp'
import hamster_life from '../assets/animals/plush-A/hamster/life-atlas.webp'
export const plushArt={momo:{direction:directionArt.momo,png:momo_idle,walk:momo_walk,life:momo_life},bibi:{direction:directionArt.bibi,png:bibi_idle,walk:bibi_walk,life:bibi_life},coco:{direction:directionArt.coco,png:coco_idle,walk:coco_walk,life:coco_life},dudu:{direction:directionArt.dudu,png:dudu_idle,walk:dudu_walk,life:dudu_life},lulu:{direction:directionArt.lulu,png:lulu_idle,walk:lulu_walk,life:lulu_life},toto:{direction:directionArt.toto,png:toto_idle,walk:toto_walk,life:toto_life},byeol:{direction:directionArt.byeol,png:byeol_idle,walk:byeol_walk,life:byeol_life},mungchi:{direction:directionArt.mungchi,png:mungchi_idle,walk:mungchi_walk,life:mungchi_life},hamster:{direction:directionArt.hamster,png:hamster_idle,walk:hamster_walk,life:hamster_life}} as const
export const animalArt={cat:plushArt.momo,bunny:plushArt.bibi,dog:plushArt.mungchi,bear:plushArt.coco,fox:plushArt.dudu,hamster:plushArt.hamster}
export function animalAppearance(friend:{id?:string;kind:string;color:string}){
 if(friend.kind==='hamster')return plushArt.hamster
 if(friend.id&&Object.hasOwn(plushArt,friend.id))return plushArt[friend.id as keyof typeof plushArt]
 if(friend.kind==='cat'&&friend.color==='#f4dfb8')return plushArt.lulu
 if(friend.kind==='bear'&&friend.color==='#b48c71')return plushArt.toto
 if(friend.kind==='bunny'&&friend.color==='#c4afe4')return plushArt.byeol
 return animalArt[friend.kind as AnimalKind]??plushArt.momo
}
export const lifeFrames={idle:0,blink:1,sit:2,sleep:3,stretch:4,groom:5,yawn:6,look:7,happy:8,eatOpen:9,eatClosed:10,play:11} as const
