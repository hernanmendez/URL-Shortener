const app = require('express')()

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/URLShortener')

const URLs = mongoose.model('urls', mongoose.Schema({
  original_url: { type: String },
  id: { type: String, unique: true },
  shortened_url: { type: String }
}))

const { randomBytes } = require('crypto')
const generateToken = () => {
  return new Promise((resolve, reject) => {
    randomBytes(6, (err, buffer) => {
      if (err) reject(err)
      else resolve(buffer.toString('base64'))
    })
  })
}

app.get('/new/*', (req, res) => {
  let original_url = req.originalUrl.substring(5)
  if (/\./.test(original_url)) {
    if (original_url.substring(0, 4) !== 'http') original_url = 'http://' + original_url
    generateToken()
      .then(id => {
        const obj = { original_url, id, shortened_url: `${req.get('host')}/${id}` }
        const newUrl = new URLs(obj)
        newUrl.save()
          .then(e => res.status(201).json(obj))
          .catch(e => {
            console.error(e)
            if (/duplicate\skey/.test(e.message)) {
              res.status(500).send('Sorry, could you try again?')
            } else {
              res.status(500).send('Something bad happened T-T')
            }
          })
      })
      .catch(e => {
        console.error(e)
        res.status(500).send('Something bad happened T-T')
      })
  } else {
    res.status(422).send('What you submitted isn\'t a URL')
  }
})

app.get('/:id', (req, res) => {
  const { id } = req.params
  URLs.findOne({ id })
    .then(result => {
      if (result) {
        res.redirect(result.original_url)
      } else {
        res.status(422).send('This url is not on the database')
      }
    }).catch(e => {
      console.error(e)
      res.status(500).send('Something bad happened T-T')
    })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`app is listening in port ${port}`))