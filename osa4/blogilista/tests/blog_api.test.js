const assert = require('node:assert')
const { test, after, beforeEach, describe } = require('node:test')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Blog = require('../models/blog')
const User = require('../models/user')

const api = supertest(app)

const createUserAndLogin = async (username, name, password) => {
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await new User({ username, name, passwordHash }).save()

  const response = await api
    .post('/api/login')
    .send({ username, password })

  return { user, token: response.body.token }
}

describe('when there is initially some blogs saved', () => {
  let rootUser
  let token

  beforeEach(async () => {
    await Blog.deleteMany({})
    await User.deleteMany({})

    const login = await createUserAndLogin('root', 'Superuser', 'sekret')
    rootUser = login.user
    token = login.token

    const blogs = await Blog.insertMany(
      helper.initialBlogs.map(blog => ({ ...blog, user: rootUser._id }))
    )
    rootUser.blogs = blogs.map(blog => blog._id)
    await rootUser.save()
  })

  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')

    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('unique identifier property of the blogs is named id', async () => {
    const response = await api.get('/api/blogs')

    response.body.forEach(blog => {
      assert.ok(blog.id)
      assert.strictEqual(blog._id, undefined)
    })
  })

  test('blogs are returned with the information of the user who added them', async () => {
    const response = await api.get('/api/blogs')

    response.body.forEach(blog => {
      assert.deepStrictEqual(blog.user, {
        username: 'root',
        name: 'Superuser',
        id: rootUser._id.toString(),
      })
    })
  })

  describe('addition of a new blog', () => {
    test('succeeds with valid data', async () => {
      const newBlog = {
        title: 'Canonical string reduction',
        author: 'Edsger W. Dijkstra',
        url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html',
        likes: 12,
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

      const addedBlog = blogsAtEnd.find(blog => blog.title === newBlog.title)
      assert.ok(addedBlog)
      assert.strictEqual(addedBlog.author, newBlog.author)
      assert.strictEqual(addedBlog.url, newBlog.url)
      assert.strictEqual(addedBlog.likes, newBlog.likes)
    })

    test('sets likes to 0 if it is missing', async () => {
      const newBlog = {
        title: 'Type wars',
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      }

      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.likes, 0)
    })

    test('sets the token holder as the creator of the blog', async () => {
      const other = await createUserAndLogin('hellas', 'Arto Hellas', 'salainen')

      const newBlog = {
        title: 'First class tests',
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html',
        likes: 10,
      }

      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${other.token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.user, other.user._id.toString())

      const userInDb = await User.findById(other.user._id)
      const userBlogIds = userInDb.blogs.map(id => id.toString())
      assert.deepStrictEqual(userBlogIds, [response.body.id])
    })

    test('fails with status code 400 if title is missing', async () => {
      const newBlog = {
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html',
        likes: 0,
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with status code 400 if url is missing', async () => {
      const newBlog = {
        title: 'TDD harms architecture',
        author: 'Robert C. Martin',
        likes: 0,
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with status code 401 if token is missing', async () => {
      const newBlog = {
        title: 'Type wars',
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      }

      const response = await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      assert(response.body.error.includes('token'))

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with status code 401 if token is invalid', async () => {
      const newBlog = {
        title: 'Type wars',
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      }

      await api
        .post('/api/blogs')
        .set('Authorization', 'Bearer invalidtoken')
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with status code 401 if token is expired', async () => {
      const expiredToken = jwt.sign(
        { username: rootUser.username, id: rootUser._id, exp: Math.floor(Date.now() / 1000) - 60 },
        process.env.SECRET
      )

      const newBlog = {
        title: 'Type wars',
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      }

      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(response.body.error, 'token expired')

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })

  describe('deletion of a blog', () => {
    test('succeeds with status code 204 if id is valid and user is the creator', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

      const ids = blogsAtEnd.map(blog => blog.id)
      assert(!ids.includes(blogToDelete.id))

      const userInDb = await User.findById(rootUser._id)
      const userBlogIds = userInDb.blogs.map(id => id.toString())
      assert(!userBlogIds.includes(blogToDelete.id))
    })

    test('fails with status code 401 if token is missing', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .expect(401)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with status code 403 if user is not the creator', async () => {
      const other = await createUserAndLogin('hellas', 'Arto Hellas', 'salainen')

      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(403)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with status code 404 if blog does not exist', async () => {
      const validNonexistingId = await helper.nonExistingId()

      await api
        .delete(`/api/blogs/${validNonexistingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    test('fails with status code 400 if id is invalid', async () => {
      const invalidId = '5a3d5da59070081a82a3445'

      await api
        .delete(`/api/blogs/${invalidId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })

  describe('updating a blog', () => {
    test('succeeds with valid data', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[0]

      const updatedData = { ...blogToUpdate, likes: blogToUpdate.likes + 10 }

      const response = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(updatedData)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.deepStrictEqual(response.body, { ...updatedData, user: blogToUpdate.user.toString() })

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

      const blogInDb = blogsAtEnd.find(blog => blog.id === blogToUpdate.id)
      assert.strictEqual(blogInDb.likes, blogToUpdate.likes + 10)
    })

    test('fails with status code 404 if blog does not exist', async () => {
      const validNonexistingId = await helper.nonExistingId()

      await api
        .put(`/api/blogs/${validNonexistingId}`)
        .send(helper.initialBlogs[0])
        .expect(404)
    })

    test('fails with status code 400 if id is invalid', async () => {
      const invalidId = '5a3d5da59070081a82a3445'

      await api
        .put(`/api/blogs/${invalidId}`)
        .send(helper.initialBlogs[0])
        .expect(400)
    })

    test('fails with status code 400 if data is invalid', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[0]

      const invalidData = { title: blogToUpdate.title, author: blogToUpdate.author, likes: 100 }

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(invalidData)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      const blogInDb = blogsAtEnd.find(blog => blog.id === blogToUpdate.id)
      assert.deepStrictEqual(blogInDb, blogToUpdate)
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})
