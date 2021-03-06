const router = require('express').Router();
const database = require(`${ process.cwd() }/utils/database`);
const localhost = require(`${ process.cwd() }/utils/localhost`);
const validator = require('express-validator');

/**
 * CUVita Server Side Implementations - Antisocial API
 * @author hsun
 * @version 0.2.3
 * @copyright  © CHINESE UNION 2019
 */

router.use(require('body-parser').json());

async function getNextSequenceValue(sequenceName){
  const sequenceDocument = await database.findOneAndUpdate('counters', {_id: sequenceName },
        {$inc:{sequence_value:1}},
        {returnNewDocument:true}
      );
  return sequenceDocument.value.sequence_value;
}

router.get('/member_info', async (req, res) => {
  const { openid } = req.query;
  const memberInfo = await database.findOne('members', {openid: openid});
  if (memberInfo) {
    return res.json({
      is_member: !!memberInfo,
      ...memberInfo
    })
  }
  return res.json({
    is_member: !!memberInfo
  })
});

router.post('/apply',
    [ validator.body(['openid', 'name', 'tel', 'email']).exists(),
      validator.body('name').trim()],
    async (req, res) => {
      if (validator.validationResult(req).errors.length)
        return res.status(400).end();
      let { body } = req;
      const isMember = !!await database.findOne('members', {openid: body.openid});

      // check if any of the fields were used before
      const openidApplied = !!await database.findOne('antisocial', {openid: body.openid});
      const emailApplied = !!await database.findOne('antisocial', {email: body.email});
      const telApplied = !!await database.findOne('antisocial', {tel: body.tel});

      if (openidApplied || emailApplied || telApplied) {
        return res.json({
          applied: true,
          error_message: "已注册，请勿重复注册"
        })
      }

      let lottery_number = [];
      if (isMember) {
        const genLotNum = await getNextSequenceValue('antisocialCtr');
        await database.insertOne('antisocial', {
          lottery_number: genLotNum,
          ...body
        });
        lottery_number.push(genLotNum);
      }

      const genLotNum = await getNextSequenceValue('antisocialCtr');
      await database.insertOne('antisocial', {
        lottery_number: genLotNum,
        ...body
      });
      lottery_number.push(genLotNum);


      return res.json({
        applied: false,
        lottery_number,
      });
    }
);

module.exports = router;
