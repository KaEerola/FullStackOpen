const assert = require('node:assert')
const { test, after, beforeEach, describe } = require('node:test')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const User = require('../models/user')

const api = supertest(app)

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', name: 'Superuser', passwordHash })

    await user.save()
  })

  test('users are returned as json', async () => {
    const response = await api
      .get('/api/users')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.length, 1)
    assert.strictEqual(response.body[0].username, 'root')
    assert.strictEqual(response.body[0].name, 'Superuser')
    assert.ok(response.body[0].id)
  })

  test('returned users do not reveal the password hash', async () => {
    const response = await api.get('/api/users')

    response.body.forEach(user => {
      assert.strictEqual(user.passwordHash, undefined)
    })
  })

  describe('creation of a new user', () => {
    test('succeeds with a fresh username', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'mluukkai',
        name: 'Matti Luukkainen',
        password: 'salainen',
      }

      const response = await api
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.username, newUser.username)
      assert.strictEqual(response.body.name, newUser.name)
      assert.strictEqual(response.body.password, undefined)
      assert.strictEqual(response.body.passwordHash, undefined)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

      const usernames = usersAtEnd.map(user => user.username)
      assert(usernames.includes(newUser.username))
    })

    test('stores the password as a bcrypt hash', async () => {
      const newUser = {
        username: 'hellas',
        name: 'Arto Hellas',
        password: 'salainen',
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(201)

      const userInDb = await User.findOne({ username: newUser.username })
      assert.notStrictEqual(userInDb.passwordHash, newUser.password)
      assert(await bcrypt.compare(newUser.password, userInDb.passwordHash))
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})
