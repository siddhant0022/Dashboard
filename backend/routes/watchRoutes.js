const express = require("express")
const router = express.Router()

const PacketDecoder = require("../parsers/packetDecoder")
const vitalsProcessor = require("../processors/vitalsProcessor")
const logger = require("../logger")

router.post("/upload", async (req, res) => {

  try {

    const payload = req.body

    logger.info("Watch packet received", {
      size: payload.length
    })

    let startPos = 0
    const packets = []

    while (startPos < payload.length) {

      const decoded = PacketDecoder.decodePacket(payload, startPos)

      packets.push(decoded)

      startPos = decoded.nextPosition
    }

    const vitals = vitalsProcessor.process(packets)

    logger.info("Vitals decoded", vitals)

    res.json({ code: 0 })

  } catch (err) {

    logger.error("Upload error", err)

    res.status(500).json({ code: 1 })

  }

})

module.exports = router