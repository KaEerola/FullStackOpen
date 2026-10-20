const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  return blogs.reduce((favorite, blog) =>
    blog.likes > favorite.likes ? blog : favorite
  )
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const blogCounts = {}
  blogs.forEach(blog => {
    blogCounts[blog.author] = (blogCounts[blog.author] || 0) + 1
  })

  const author = Object.keys(blogCounts).reduce((top, author) =>
    blogCounts[author] > blogCounts[top] ? author : top
  )

  return { author, blogs: blogCounts[author] }
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const likeCounts = {}
  blogs.forEach(blog => {
    likeCounts[blog.author] = (likeCounts[blog.author] || 0) + blog.likes
  })

  const author = Object.keys(likeCounts).reduce((top, author) =>
    likeCounts[author] > likeCounts[top] ? author : top
  )

  return { author, likes: likeCounts[author] }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
}
