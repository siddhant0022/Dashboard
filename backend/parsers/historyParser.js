class HistoryParser {

  static parse(payload) {

    const result = []
    let pos = 0

    while (pos < payload.length) {

      const timestamp = payload.readUInt32LE(pos)
      pos += 4

      const heartRate = payload[pos]
      pos += 1

      const steps = payload.readUInt16LE(pos)
      pos += 2

      result.push({
        timestamp,
        heartRate,
        steps
      })

    }

    return result
  }

}

module.exports = HistoryParser