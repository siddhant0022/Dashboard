class SleepProcessor {

  static process(payload) {

    const sleepData = []

    let pos = 0

    while (pos < payload.length) {

      const timestamp = payload.readUInt32LE(pos)
      pos += 4

      const stage = payload[pos]
      pos += 1

      sleepData.push({
        timestamp,
        stage
      })
    }

    return sleepData
  }

}

module.exports = SleepProcessor