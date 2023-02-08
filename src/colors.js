import { Color } from 'three'

export const HSL = (h, s, l) => {
  return new Color().setHSL(h, s, l)
}

export const white = new Color(0xfffdfc)
export const red = new Color(0xcd4832) //HSL(1, 0.5, 0.5)
export const blue = new Color(0x0e867f) //HSL(0.5, 0.5, 0.5)
export const grey = new Color(0x5f5e55) //HSL(0.5, 0.1, 0.5)
export const pink = new Color(0xe40873)
export const yellow = new Color(0xfdde3b)
export const gold = new Color(0xbca961)
export const clay = new Color(0x615c45)
export const brown = new Color(0x9d6b49)
export const orange = new Color(0xe16f00)
export const mustard = new Color(0xfdce3b)
