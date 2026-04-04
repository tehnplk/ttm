declare module 'dom-to-image' {
  export interface Options {
    quality?: number;
    width?: number;
    height?: number;
    bgcolor?: string;
    style?: Record<string, string>;
    filter?: (node: Node) => boolean;
    imagePlaceholder?: string;
    cacheBust?: boolean;
  }

  export interface DomToImage {
    toPng(node: Node, options?: Options): Promise<string>;
    toJpeg(node: Node, options?: Options): Promise<string>;
    toBlob(node: Node, options?: Options): Promise<Blob>;
    toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
    toSvg(node: Node, options?: Options): Promise<string>;
    toCanvas(node: Node, options?: Options): Promise<HTMLCanvasElement>;
  }

  const domtoimage: DomToImage;
  export default domtoimage;
}

