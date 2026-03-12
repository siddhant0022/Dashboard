const express = require("express")
const fs = require("fs")
const path = require("path")

const PacketDecoder = require("../utils/packetDecoder")
const HistoryParser = require("../parsers/historyParser")
const SleepProcessor = require("../processors/sleepProcessor")
const ECGProcessor = require("../processors/ecgProcessor")
const RRIProcessor = require("../processors/rriProcessor")

const router = express.Router()

router.post("/upload", (req,res)=>{

  const payload = req.body

  if(!payload || payload.length < 23)
    return res.send(Buffer.from([0x02]))

  const deviceId = payload.slice(0,15).toString()

  let startPos = 15

  while(true){

    const packet = PacketDecoder.decodePacket(payload,startPos)

    const opt = packet.opt
    const pbPayload = packet.payload

    if(opt === 0x80){

      const history = HistoryParser.parse(pbPayload)
      const sleep = SleepProcessor.process(pbPayload)
      const ecg = ECGProcessor.process(pbPayload)
      const rri = RRIProcessor.process(pbPayload)

      console.log({
        historyCount:history.length,
        sleepCount:sleep.length,
        ecgPoints:ecg.length,
        rriCount:rri.length
      })

      const filePath = path.join(
        process.cwd(),
        "raw_data",
        `${deviceId}_${Date.now()}_0x80.bin`
      )

      fs.appendFileSync(filePath,pbPayload)

    }

    startPos = packet.nextPosition

    if(payload.length === startPos)
      break

  }

  res.send(Buffer.from([0x00]))

})

module.exports = router