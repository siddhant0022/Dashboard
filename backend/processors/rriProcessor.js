class RRIProcessor {

  static process(payload) {

    const rriList = []

    let pos = 0

    while (pos < payload.length) {

      const rri = payload.readUInt16LE(pos)
      pos += 2

      rriList.push(rri)
    }

    return rriList
  }

}

module.exports = RRIProcessor