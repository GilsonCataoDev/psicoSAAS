import express = require('express')
import multer = require('multer')
import request = require('supertest')
import { AVATAR_UPLOAD_OPTIONS } from '../avatar-upload.config'

describe('avatar upload', () => {
  it('accepts one valid JPG without multipart fields', async () => {
    const app = express()
    app.post('/avatar', multer(AVATAR_UPLOAD_OPTIONS).single('avatar'), (req, res) => {
      res.status(200).json({ size: req.file?.size })
    })

    const response = await request(app)
      .post('/avatar')
      .attach('avatar', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
        filename: 'perfil.jpg',
        contentType: 'image/jpeg',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ size: 4 })
  })
})
