class PacketDecoder {

  static decodePacket(buffer, startPos) {

    const prefix = buffer.slice(startPos, startPos + 2)

    if (prefix[0] !== 0x44 || prefix[1] !== 0x54) {
      throw new Error("Invalid packet header")
    }

    const lengthBytes = buffer.slice(startPos + 2, startPos + 4)
    const length = lengthBytes[1] * 256 + lengthBytes[0]

    const optBytes = buffer.slice(startPos + 6, startPos + 8)
    const opt = optBytes.readUInt16LE(0)

    const payload = buffer.slice(startPos + 8, startPos + 8 + length)

    return {
      opt,
      payload,
      nextPosition: startPos + 8 + length
    }

  }

}

module.exports = PacketDecoder