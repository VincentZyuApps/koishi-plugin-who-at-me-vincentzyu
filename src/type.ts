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