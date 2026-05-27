export const MESSSAGE_FORM = {
 TEXT: 'text',
 IMAGE: 'image',
 FORWARD: 'forward',
} as const;

//maybe can be used in future
export const ELEMENT_TYPE_MAP: { [key: string]: string } = {
  'text': '文本',
  'at': '艾特',
  'img': '图片',
  'face': 'QQ表情'
} as const;

export interface AtMentionRecord {
  messageId: string;
  userId: string;
  content: string;
  timestamp: number;
  platform: string;
}

export interface PaginatedResult {
  records: AtMentionRecord[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}