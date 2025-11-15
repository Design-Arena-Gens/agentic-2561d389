declare module "tz-lookup" {
  type TzLookup = (latitude: number, longitude: number) => string;
  const tzLookup: TzLookup;
  export default tzLookup;
}

