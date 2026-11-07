import { isoDate } from '../../domain/diet-calc';
import {
  CareTask,
  MemberRequest,
  Message,
  PortalAccess,
  ReadMarker,
} from '../../domain/portal.models';

const DIETITIAN = 'Dyt. Deniz Arslan';

/**
 * Demo data for the member portal, relative to `today`. Uses the client ids from `diet-seed.ts`.
 * Remove once the portal reads from MainAPI.
 */
export function createPortalSeed(today: Date) {
  const at = (dayOffset: number, hh: number, mm: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };
  const date = (dayOffset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return isoDate(d);
  };

  const access: PortalAccess[] = [
    { clientId: 'c-1', status: 'active', invitedAt: at(-80, 10, 0), activatedAt: at(-80, 18, 0) },
    { clientId: 'c-2', status: 'active', invitedAt: at(-60, 10, 0), activatedAt: at(-59, 9, 0) },
    { clientId: 'c-3', status: 'invited', invitedAt: at(-2, 12, 0), activatedAt: null },
    { clientId: 'c-4', status: 'active', invitedAt: at(-40, 10, 0), activatedAt: at(-40, 20, 0) },
  ];

  const tasks: CareTask[] = [
    {
      id: 't-1',
      clientId: 'c-1',
      title: 'Öğle yemeğinin fotoğrafını gönder',
      description: 'Porsiyonu birlikte değerlendirelim; tabağın tamamı görünsün.',
      category: 'photo',
      dueDate: date(0),
      status: 'open',
      createdAt: at(-1, 18, 10),
      completedAt: null,
      completionNote: '',
      attachments: [],
    },
    {
      id: 't-2',
      clientId: 'c-1',
      title: 'Haftalık tartı ölçümü',
      description: 'Sabah aç karnına, tuvaletten sonra tartılın.',
      category: 'measurement',
      dueDate: date(3),
      status: 'open',
      createdAt: at(-3, 10, 0),
      completedAt: null,
      completionNote: '',
      attachments: [],
    },
    {
      id: 't-3',
      clientId: 'c-1',
      title: 'Günde 2,5 L su',
      description: '',
      category: 'water',
      dueDate: date(-2),
      status: 'done',
      createdAt: at(-9, 9, 0),
      completedAt: at(-2, 21, 0),
      completionNote: 'Hafta boyunca hedefi tutturdum.',
      attachments: [],
    },
    {
      id: 't-4',
      clientId: 'c-2',
      title: 'Açlık kan şekeri değerlerini paylaş',
      description: 'Son 7 günün sabah ölçümlerini yazmanız yeterli.',
      category: 'measurement',
      dueDate: date(-2),
      status: 'open',
      createdAt: at(-6, 11, 0),
      completedAt: null,
      completionNote: '',
      attachments: [],
    },
    {
      id: 't-5',
      clientId: 'c-4',
      title: 'Antrenman sonrası öğün kaydı',
      description: 'Üç antrenman günü için öğün içeriğini yazın.',
      category: 'meal_log',
      dueDate: date(2),
      status: 'open',
      createdAt: at(-4, 19, 0),
      completedAt: null,
      completionNote: '',
      attachments: [],
    },
  ];

  const requests: MemberRequest[] = [
    {
      id: 'r-1',
      clientId: 'c-1',
      type: 'appointment',
      subject: 'Kontrol randevusunu öne alabilir miyiz?',
      detail: 'Önümüzdeki hafta seyahatteyim, mümkünse bu hafta perşembe öğleden sonra.',
      status: 'open',
      createdAt: at(-1, 20, 15),
      updatedAt: at(-1, 20, 15),
      response: '',
      attachments: [],
    },
    {
      id: 'r-2',
      clientId: 'c-2',
      type: 'plan_change',
      subject: 'Hafta sonu menüsü',
      detail: 'Hafta sonları aile yemeklerinde plana uymakta zorlanıyorum.',
      status: 'in_progress',
      createdAt: at(-20, 21, 0),
      updatedAt: at(-19, 9, 30),
      response: 'Esnek bir hafta sonu menüsü hazırlıyorum.',
      attachments: [],
    },
    {
      id: 'r-3',
      clientId: 'c-4',
      type: 'document',
      subject: 'Spor kulübü için beslenme raporu',
      detail: 'Kulüp doktoru güncel planımı istiyor.',
      status: 'resolved',
      createdAt: at(-10, 12, 0),
      updatedAt: at(-9, 10, 0),
      response: 'Rapor hazırlandı, kliniğimizden teslim alabilirsiniz.',
      attachments: [],
    },
  ];

  const messages: Message[] = [
    msg('g-1', 'c-1', 'dietitian', DIETITIAN, 'Merhaba Elif Hanım, Faz 2 planınız yayında. Sorunuz olursa buradan yazabilirsiniz.', at(-28, 10, 0)),
    msg('g-2', 'c-1', 'member', 'Elif Kaya', 'Teşekkürler! Ara öğünde yoğurt yerine kefir içebilir miyim?', at(-27, 8, 40)),
    msg('g-3', 'c-1', 'dietitian', DIETITIAN, 'Evet, 200 ml kefir aynı yerine geçer.', at(-27, 9, 5)),
    msg('g-4', 'c-1', 'dietitian', DIETITIAN, 'Size yeni bir görev atadım.', at(-1, 18, 10), { taskId: 't-1' }),
    msg('g-5', 'c-1', 'member', 'Elif Kaya', 'Yeni bir talep oluşturdum.', at(-1, 20, 15), { requestId: 'r-1' }),
    msg('g-6', 'c-2', 'dietitian', DIETITIAN, 'Size yeni bir görev atadım.', at(-6, 11, 0), { taskId: 't-4' }),
    msg('g-7', 'c-2', 'member', 'Mert Yıldız', 'Bu hafta ölçümleri aksattım, yarın göndereceğim.', at(-1, 22, 5)),
    msg('g-8', 'c-2', 'member', 'Mert Yıldız', 'Bir de akşam yürüyüşünü 30 dakikaya çıkardım.', at(-1, 22, 6)),
    msg('g-9', 'c-4', 'member', 'Burak Demir', 'Raporu aldım, teşekkürler.', at(-8, 18, 0), { requestId: 'r-3' }),
    msg('g-10', 'c-4', 'dietitian', DIETITIAN, 'Size yeni bir görev atadım.', at(-4, 19, 0), { taskId: 't-5' }),
  ];

  const readMarkers: ReadMarker[] = [
    { clientId: 'c-1', dietitianReadAt: at(-1, 19, 0), memberReadAt: at(-27, 9, 10) },
    { clientId: 'c-2', dietitianReadAt: at(-2, 9, 0), memberReadAt: at(-1, 22, 6) },
    { clientId: 'c-4', dietitianReadAt: at(-4, 19, 0), memberReadAt: at(-4, 20, 0) },
  ];

  return { access, tasks, requests, messages, readMarkers };
}

function msg(
  id: string,
  clientId: string,
  author: Message['author'],
  authorName: string,
  body: string,
  at: string,
  extra: Pick<Message, 'taskId' | 'requestId'> = {},
): Message {
  return { id, clientId, author, authorName, body, at, attachments: [], ...extra };
}
