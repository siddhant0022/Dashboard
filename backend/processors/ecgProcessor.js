class ECGProcessor {

  static process(payload) {

    const ecgPoints = []

    for (let i = 0; i < payload.length; i += 2) {

      const value = payload.readInt16LE(i)

      ecgPoints.push(value)
    }

    return ecgPoints
  }

}

module.exports = ECGProcessor