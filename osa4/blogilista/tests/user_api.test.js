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

  test('users are returned with the blogs they have added', async () => {
    const newBlog = {
      title: 'Things I Don\'t Know as of 2018',
      author: 'Dan Abramov',
      url: 'https://overreacted.io/things-i-dont-know-as-of-2018/',
    }

    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })

    const blogResponse = await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
      .send(newBlog)
      .expect(201)

    const response = await api.get('/api/users')
    const root = response.body.find(user => user.username === 'root')

    assert.deepStrictEqual(root.blogs, [{ ...newBlog, id: blogResponse.body.id }])
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

    test('succeeds when username and password are exactly 3 characters long', async () => {
      const usersAtStart = await helper.usersInDb()

      await api
        .post('/api/users')
        .send({ username: 'abc', name: 'Short Names', password: 'xyz' })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)
    })

    const expectCreationToFail = async (newUser, expectedError) => {
      const usersAtStart = await helper.usersInDb()

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes(expectedError), `unexpected error: ${result.body.error}`)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    }

    test('fails with status code 400 and message if username is already taken', async () => {
      await expectCreationToFail(
        { username: 'root', name: 'Superuser', password: 'salainen' },
        'expected `username` to be unique'
      )
    })

    test('fails with status code 400 and message if username is missing', async () => {
      await expectCreationToFail(
        { name: 'No Username', password: 'salainen' },
        'Path `username` is required'
      )
    })

    test('fails with status code 400 and message if username is shorter than 3 characters', async () => {
      await expectCreationToFail(
        { username: 'ab', name: 'Short Username', password: 'salainen' },
        'is shorter than the minimum allowed length (3)'
      )
    })

    test('fails with status code 400 and message if password is missing', async () => {
      await expectCreationToFail(
        { username: 'nopassword', name: 'No Password' },
        'password must be at least 3 characters long'
      )
    })

    test('fails with status code 400 and message if password is shorter than 3 characters', async () => {
      await expectCreationToFail(
        { username: 'shortpassword', name: 'Short Password', password: 'ab' },
        'password must be at least 3 characters long'
      )
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})
