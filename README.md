# ShelfSpace

## Description
ShelfSpace is a modern and interactive bookshelf management platform designed to help users organize, explore, and engage with their personal book collections. Users can register and manage their accounts to create customized bookshelves, search for books by various criteria, and view detailed information about their favorite titles.

## Features
- User Management
  - The system must allow users to register an account.
  - The system must allow users to log in and log out of their account.
- Bookshelf Management
  - The system must allow users to create a new bookshelf.
  - The system must display all books in the user’s bookshelf.
  - The system must allow users to add books to their bookshelf.
  - The system must allow users to remove books from their bookshelf.
- Book Search and Display
  - The system must allow users to search for books by ISBN, title, or author.
  - The system must display a list of books matching the search keyword.
  - The system must display book details on a separate page when a book is clicked.

## Installation
  1. Clone the repository:
     ```bash
      https://github.com/jalmari1/ShelfSpace-Node.git
  3. Navigate to the project directory:
     ```bash
     cd ShelfSpace-Node
  
  5. Install dependencies:
     ```bash
     npm install express axios mongodb dotenv cors bcryptjs jwt
  
  7. Run the project:
     ```bash
     node server.js
