module.exports = {

  process(packets) {

    const result = []

    packets.forEach(packet => {

      const payload = packet.payload

      if (payload.length < 8) return

      const heartRate = payload[0]
      const spo2 = payload[1]
      const steps = payload.readUInt16LE(2)

      result.push({
        heart_rate: heartRate,
        spo2,
        steps,
        timestamp: new Date().toISOString()
      })

    })

    return result

  }

}