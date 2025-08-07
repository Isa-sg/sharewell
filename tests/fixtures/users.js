const bcrypt = require('bcryptjs');

const testUsers = {
  john: {
    id: 1,
    email: 'john@test.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    hashedPassword: bcrypt.hashSync('password123', 10),
    linkedinId: null,
    linkedinToken: null
  },
  jane: {
    id: 2,
    email: 'jane@test.com', 
    password: 'password456',
    firstName: 'Jane',
    lastName: 'Smith',
    hashedPassword: bcrypt.hashSync('password456', 10),
    linkedinId: 'linkedin123',
    linkedinToken: 'token123'
  }
};

const testPosts = {
  post1: {
    id: 1,
    content: 'This is a test post about AI innovation',
    authorId: 1,
    createdAt: new Date().toISOString(),
    isDeleted: 0
  },
  post2: {
    id: 2,
    content: 'Another test post about technology trends',
    authorId: 2,
    createdAt: new Date().toISOString(),
    isDeleted: 0
  }
};

module.exports = {
  testUsers,
  testPosts
};
