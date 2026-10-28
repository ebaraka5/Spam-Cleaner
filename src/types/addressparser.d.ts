declare module 'addressparser' {
  export interface ParsedAddress {
    address: string;
    name: string;
  }
  function addressparser(input: string): ParsedAddress[];
  export default addressparser;
}
