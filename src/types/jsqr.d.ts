/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'jsqr' {
  interface QRCodePoint {
    x: number;
    y: number;
  }

  interface QRCodeLocation {
    topRightCorner: QRCodePoint;
    topLeftCorner: QRCodePoint;
    bottomRightCorner: QRCodePoint;
    bottomLeftCorner: QRCodePoint;
    topRightFinderPattern: QRCodePoint;
    topLeftFinderPattern: QRCodePoint;
    bottomLeftFinderPattern: QRCodePoint;
    bottomRightAlignmentPattern?: QRCodePoint;
  }

  interface QRCode {
    binaryData: number[];
    data: string;
    chunks: any[];
    location: QRCodeLocation;
  }

  interface Options {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QRCode | null;

  export default jsQR;
}
