/**
 * Encoder modules convert a specific type of data to text and back again.
 */
export interface SerializerExtension {
    /**
     * Globally unique identifier for the encoder, used to decode it properly.
     */
    id: string;

    /**
     * Higher priority extensions will be preferred over lower priority ones.
     */
    priority: number;

    /**
     * Only encode data that passes this test.
     */
    test: (data: object) => boolean;

    /**
     * Encode the data into a string.
     */
    encode: (data: any) => string;

    /**
     * Decode the data from a string.
     */
    decode: (encoded: string) => any;
}