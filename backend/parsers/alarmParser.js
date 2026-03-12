class AlarmParser {

  static parse(payload) {

    const alarms = []

    let pos = 0

    while (pos < payload.length) {

      const alarmType = payload[pos]
      pos++

      const timestamp = payload.readUInt32LE(pos)
      pos += 4

      alarms.push({
        type: alarmType,
        timestamp
      })
    }

    return alarms
  }

}

module.exports = AlarmParser