import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { BUILD_INFO } from './build-info';
export interface RemoteVersion { version:string; buildId?:string; releaseNotes?:string[]; }
@Injectable({ providedIn:'root' }) export class VersionStore {
  private readonly document=inject(DOCUMENT); private timer:number|undefined;
  readonly current=BUILD_INFO; readonly remote=signal<RemoteVersion|null>(null); readonly updateRequired=signal(false); readonly updating=signal(false);
  start():void { if(this.timer)return; void this.check(); this.timer=window.setInterval(()=>void this.check(),300_000); this.document.addEventListener('visibilitychange',()=>{if(this.document.visibilityState==='visible')void this.check();}); }
  async check():Promise<void>{try{const response=await fetch(`/version.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)return;const value=await response.json() as RemoteVersion;this.remote.set(value);if(value.buildId&&value.buildId!==BUILD_INFO.buildId)this.updateRequired.set(true);}catch{}}
  requireUpdate():void{this.updateRequired.set(true);}
  async applyUpdate():Promise<void>{if(this.updating())return;this.updating.set(true);try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(x=>x.unregister()));}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(x=>x.startsWith('ngsw:')||x.startsWith('odivon:')).map(x=>caches.delete(x)));}}finally{window.location.reload();}}
}
