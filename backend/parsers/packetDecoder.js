class PacketDecoder {

  static decodePacket(buffer, startPos) {

    const prefix1 = buffer[startPos]
    const prefix2 = buffer[startPos + 1]

    if (prefix1 !== 0x44 || prefix2 !== 0x54) {
      throw new Error("Invalid packet header")
    }

    const length = buffer.readUInt16LE(startPos + 2)

    const opt = buffer.readUInt16LE(startPos + 6)

    const payload = buffer.slice(startPos + 8, startPos + 8 + length)

    return {
      opt,
      length,
      payload,
      nextPosition: startPos + 8 + length
    }

  }

}

module.exports = PacketDecoder