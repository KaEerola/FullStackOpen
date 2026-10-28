const assert = require('node:assert')
const { test, after, beforeEach, describe } = require('node:test')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const User = require('../models/user')

const api = supertest(app)

describe('login', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    await new User({ username: 'root', name: 'Superuser', passwordHash }).save()
  })

  test('succeeds with correct credentials and returns a valid token', async () => {
    const response = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.username, 'root')
    assert.strictEqual(response.body.name, 'Superuser')

    const user = await User.findOne({ username: 'root' })
    const decodedToken = jwt.verify(response.body.token, process.env.SECRET)
    assert.strictEqual(decodedToken.id, user._id.toString())
    assert.strictEqual(decodedToken.username, 'root')
  })

  test('fails with status code 401 if password is wrong', async () => {
    const response = await api
      .post('/api/login')
      .send({ username: 'root', password: 'wrong' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.error, 'invalid username or password')
    assert.strictEqual(response.body.token, undefined)
  })

  test('fails with status code 401 if username does not exist', async () => {
    const response = await api
      .post('/api/login')
      .send({ username: 'nobody', password: 'sekret' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.error, 'invalid username or password')
    assert.strictEqual(response.body.token, undefined)
  })
})

after(async () => {
  await mongoose.connection.close()
})
