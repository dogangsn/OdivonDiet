import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { RouterLink, RouterOutlet } from '@angular/router';
import { I18nStore, SupportedLang, TranslatePipe } from './core/i18n/i18n';
import { VersionStore } from './core/version/version-store';
import { PRODUCT } from './domain/product-manifest';
import { PageHeader } from './shared/ui/page-header';
import { SlideOver } from './shared/ui/slide-over';
interface DemoRow{id:number;name:string;location:string;status:'active'|'pending';updated:string;archived:boolean;}
@Component({selector:'app-root',imports:[TranslatePipe,PageHeader,SlideOver,FormField,RouterLink,RouterOutlet],templateUrl:'./app.html'}) export class App{
  readonly product=PRODUCT;readonly i18n=inject(I18nStore);readonly version=inject(VersionStore);readonly dark=signal(localStorage.getItem('odivon:theme')==='dark');readonly search=signal('');readonly archived=signal(false);readonly drawerOpen=signal(false);readonly draftModel=signal({name:''});readonly draftForm=form(this.draftModel,schema=>{required(schema.name);});
  readonly rows=signal<DemoRow[]>([{id:1,name:'Merkez Soğutma Sistemi',location:'İstanbul / Merkez',status:'active',updated:'24.10.2026',archived:false},{id:2,name:'Rooftop Klima RT-24',location:'Ankara / Fabrika',status:'pending',updated:'23.10.2026',archived:false},{id:3,name:'Eski Chiller Ünitesi',location:'İzmir / Depo',status:'active',updated:'12.09.2026',archived:true}]);
  readonly filtered=computed(()=>{const q=this.search().trim().toLocaleLowerCase(this.i18n.currentLang());return this.rows().filter(x=>x.archived===this.archived()&&(!q||`${x.name} ${x.location}`.toLocaleLowerCase().includes(q)));});
  constructor(){document.documentElement.classList.toggle('dark',this.dark());this.i18n.setLanguage(this.i18n.currentLang());this.version.start();}setLanguage(value:string):void{this.i18n.setLanguage(value as SupportedLang);}toggleTheme():void{this.dark.update(x=>!x);document.documentElement.classList.toggle('dark',this.dark());localStorage.setItem('odivon:theme',this.dark()?'dark':'light');}save():void{const name=this.draftModel().name.trim();if(name)this.rows.update(rows=>[{id:Date.now(),name,location:'Yeni Lokasyon',status:'pending',updated:new Date().toLocaleDateString('tr-TR'),archived:false},...rows]);this.drawerOpen.set(false);this.draftModel.set({name:''});}}
