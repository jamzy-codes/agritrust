declare module "qrcode" {
  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    type?: "image/png" | "image/jpeg" | "image/webp";
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toDataURL(
      text: string,
      options?: QRCodeToDataURLOptions,
    ): Promise<string>;
  };
  export default QRCode;
}