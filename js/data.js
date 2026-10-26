// Plan data transcribed from the construction drawings (Unit 8C, 18 ping).
// Plan coordinates are centimetres: x grows to the east, y grows to the south,
// origin = inner face of the kitchen west wall at the level of the north inner wall face.
// Heights (z) are centimetres above the finished floor.

export const SLAB = 297; // finished floor to original slab (drawing A0-天花板圖)

// Rooms are used for (a) per-room interior lighting and (b) the minimap/labels.
// A room is a union of rectangles [x0, y0, x1, y1].
export const ROOMS = [
  { id: 1, key: 'bedroom', name: '主臥', rects: [[-157, 0, 252, 333]], ceil: 270 },
  { id: 2, key: 'living', name: '客廳・玄關', rects: [[262, 0, 598, 585]], ceil: 280 },
  { id: 3, key: 'kitchen', name: '廚房', rects: [[0, 342, 252, 585]], ceil: 240 },
  { id: 4, key: 'study', name: '書房', rects: [[610, 0, 862, 357]], ceil: 270 },
  {
    id: 5, key: 'bath', name: '衛浴',
    rects: [[610, 376, 878, 500], [878, 448, 914, 585], [714, 500, 878, 585]], ceil: 240,
  },
  { id: 6, key: 'balcony', name: '後陽台', rects: [[-193, 342, -16, 585]], ceil: 240 },
];

export const BUILDING = { x0: -200, y0: -90, x1: 930, y1: 600 };

// Ceiling soffit over the ducted air-conditioner + entry (CH+252), see drawing A0-天花板圖.
export const SOFFIT = { x0: 262, y0: 325, x1: 598, y1: 585, h: 252 };

// Floor finish areas
export const FLOOR_RAISE_STUDY = 14; // 地板架高 +14cm

// Downlights (防眩嵌燈 9.5W 4000K) — positions read from 電燈配置 drawing, room id for light linking.
export const DOWNLIGHTS = [
  // bedroom (4)
  { x: -88, y: 100, room: 1 }, { x: 32, y: 100, room: 1 }, { x: 150, y: 165, room: 1 }, { x: 150, y: 255, room: 1 },
  // living (public area)
  { x: 448, y: 95, room: 2 }, { x: 455, y: 258, room: 2 }, { x: 330, y: 150, room: 2 },
  { x: 306, y: 404, room: 2 }, { x: 500, y: 404, room: 2 }, { x: 420, y: 520, room: 2 },
  // study
  { x: 648, y: 86, room: 4 }, { x: 822, y: 86, room: 4 }, { x: 648, y: 239, room: 4 }, { x: 822, y: 239, room: 4 },
  // bath
  { x: 690, y: 430, room: 5 }, { x: 800, y: 410, room: 5 }, { x: 860, y: 535, room: 5 },
  // kitchen (舞光泛光細框 12W)
  { x: 60, y: 420, room: 3 }, { x: 167, y: 420, room: 3 },
  // balcony
  { x: -100, y: 460, room: 6 },
];

// Camera presets (position / target in plan cm + height), used by both the sidebar and the auto tour.
// eye height of a standing person is 160 cm.
export const VIEWS = [
  {
    key: 'overview', name: '空間總覽', mode: 'orbit', icon: '◎',
    pos: [650, 1040, 1010], target: [330, 215, 20],
    text: '8C・18 坪住宅。主臥、廚房、客廳、書房、衛浴與後陽台的完整配置。',
  },
  {
    key: 'entry', name: '玄關・降落塵區', mode: 'walk', icon: '⌂',
    pos: [430, 205, 154], target: [500, 585, 112],
    text: '17.6×21 cm 六角磚降落塵區（灰綠、藍灰與褐色混搭，深色細縫），右側為橡木鞋櫃（貓掌孔），深梅紫大門配電子鎖。',
  },
  {
    key: 'living-tv', name: '客廳・電視牆', mode: 'walk', icon: '▣',
    pos: [468, 215, 152], target: [262, 205, 105],
    text: '暗灰司曼特電視牆、黑色電視櫃搭橡木抽屜與弧形門片、65 吋電視、黑色層板；窗邊是蛇形雙層遮光簾，可用上方「窗簾」鈕拉上。',
  },
  {
    key: 'living-sofa', name: '客廳・沙發背牆', mode: 'walk', icon: '▤',
    pos: [346, 215, 152], target: [598, 232, 112],
    text: '推薦沙發：3 人座窄扶手布沙發 230×85 cm（科技布，耐貓抓可擦拭），背牆為玫瑰白，配橡木壁板、圓形壁燈與觸控面板。',
  },
  {
    key: 'kitchen', name: '廚房', mode: 'walk', icon: '♨',
    pos: [96, 498, 150], target: [150, 345, 98],
    text: '二字型廚房：白色無把手平面門板、黑色踢腳與檯面黑縫、深灰玻璃壁板、細長排油煙機，油煙機右側有三扇白色吊櫃；爐台、飲水機與水槽位於北側。',
  },
  {
    key: 'dispenser', name: '飲水機（自動進水）', mode: 'walk', icon: '💧',
    pos: [150, 470, 135], target: [146, 372, 108],
    text: '賀眾牌桌上型冰溫熱飲水機接水線：角閥 → 三通 → UP-206 雙道濾芯 → 進水口，水位偏低時自動進水。',
  },
  {
    key: 'plumbing', name: '拉水線（櫃內配管）', mode: 'walk', icon: '≋',
    pos: [140, 498, 112], target: [186, 350, 54],
    text: '開櫃可見：冷水角閥 → 三通（分水至龍頭）→ UP-206 雙道濾芯（UF-1 → UF-556）→ 穿過檯面束環 → 飲水機進水口，旁邊預留專用插座。',
  },
  {
    key: 'bedroom', name: '主臥', mode: 'walk', icon: '☾',
    pos: [225, 50, 150], target: [-60, 250, 90],
    text: '玫瑰白牆面、橡木床頭板與 LED 燈帶；推薦低矮懸浮橡木床架 + 22 cm 獨立筒床墊；落地窗配蛇形雙層簾（100% 遮光布 + 薄紗）。',
  },
  {
    key: 'wardrobe', name: '主臥衣櫃', mode: 'walk', icon: '▥',
    pos: [30, 100, 150], target: [225, 235, 118],
    text: '橡木衣櫃：開放櫃、吊衣區、三抽屜，上方吊櫃，門片間留細黑縫。',
  },
  {
    key: 'study', name: '書房', mode: 'walk', icon: '✎',
    pos: [630, 60, 150], target: [800, 250, 100],
    text: '地板架高 14 cm 的書房：深色背板的開放書架（LED 層板）、橡木衣櫃、靠東牆的書桌與洞洞板，窗邊是遮光蜂巢簾（無拉繩）。',
  },
  {
    key: 'bath', name: '衛浴', mode: 'walk', icon: '❖',
    pos: [630, 395, 150], target: [860, 500, 100],
    text: '馬桶側是米白亮面壁磚；淋浴間內有跳色水磨石花磚立面；淺灰水磨石地磚（黑色細縫）、斜角淋浴拉門、石英石檯面浴櫃與造型掛鏡。',
  },
  {
    key: 'balcony', name: '後陽台', mode: 'walk', icon: '☁',
    pos: [-34, 556, 156], target: [-130, 400, 120],
    text: '深灰與淺灰長條磚牆、鋁條天花、淺灰地磚、黑框百葉鋁門、金屬欄杆、直立鋁百葉遮擋與兩支吊式曬衣桿，不放其他物品。',
  },
];
