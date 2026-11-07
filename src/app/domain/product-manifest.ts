export interface ProductManifest {
  readonly key: string;
  readonly name: string;
  readonly apiNamespace: string;
  readonly accent: string;
}

export const PRODUCT: ProductManifest = {
  key: 'diet',
  name: 'OdivonDiet',
  apiNamespace: '/api/v1/diet',
  accent: '#7c3aed',
};
