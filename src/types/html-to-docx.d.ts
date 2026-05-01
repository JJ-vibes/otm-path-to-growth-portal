declare module "html-to-docx" {
  type DocxBuffer = Buffer;
  function HTMLtoDOCX(
    html: string,
    headerHTML: string | null,
    options?: Record<string, unknown>,
    footerHTML?: string | null
  ): Promise<DocxBuffer>;
  export default HTMLtoDOCX;
}
