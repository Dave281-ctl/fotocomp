/** Typen für heic-decode (das Paket bringt keine mit). */
declare module 'heic-decode' {
	interface DecodedImage {
		width: number;
		height: number;
		/** RGBA-Pixel */
		data: Uint8ClampedArray;
	}
	export default function decode(opts: {
		buffer: ArrayBufferLike | Uint8Array;
	}): Promise<DecodedImage>;
}
