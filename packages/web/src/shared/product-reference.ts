export const referenceProducts = ["Garrafa térmica", "Copo térmico"] as const;
export const referenceOrientations = ["Horizontal", "Vertical"] as const;
export type ReferenceProduct = typeof referenceProducts[number];
export type ReferenceOrientation = typeof referenceOrientations[number];