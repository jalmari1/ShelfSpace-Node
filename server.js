import express from "express";
import axios from "axios";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
console.log("MongoDB Server URL:", process.env.MONGO_DB_SERVER);
import cors from "cors";

// Connection URL
const url = process.env.MONGO_DB_SERVER;
const client = new MongoClient(url);

// Database Name
const dbName = "ShelfSpace";

let users, bookshelf, bookreview;
async function connectDb() {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    users = db.collection("users");
    bookshelf = db.collection("bookshelf");
    bookreview = db.collection("bookreview");
  
}

connectDb();


const app = express();
const BASE_URL = "https://openlibrary.org/search.json";
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173',
}));

//*******************************
// Routes and functions for API 
//*******************************
app.get("/search/isbn/:isbn", async (req,res) => {
    const { isbn } = req.params;
  
    if (!isbn) {
      return res.status(400).send("Missing 'isbn' query parameter"); // Handle missing query parameter
    }
  
    try{
      const { data } = await axios.get(BASE_URL, {
        params: {
          isbn, // Open Library expects 'title' as the query parameter
        },
      });
  
      const extractedData = extractBookData(data.docs);
      res.json(extractedData);
  
    }catch(error){
      console.error("Error fetching search results:", error);
      res.status(500).send("Error fetching search results");
    }
  });
  
  app.get("/search/title", async (req,res) => {
  const { title } = req.query;

  if (!title) {
    return res.status(400).send("Missing 'title' query parameter"); // Handle missing query parameter
  }

  try{
    const { data } = await axios.get(BASE_URL, {
      params: {
        title, // Open Library expects 'title' as the query parameter
      },
    });

    const extractedData = extractBookData(data.docs);
    res.json(extractedData);

  }catch(error){
    console.error("Error fetching search results:", error);
    res.status(500).send("Error fetching search results");
  }
});

app.get("/search/author", async (req,res) => {
    const { author } = req.query;
  
    if (!author) {
      return res.status(400).send("Missing 'author' query parameter"); // Handle missing query parameter
    }
  
    try{
      const { data } = await axios.get(BASE_URL, {
        params: {
          author, // Open Library expects 'author' as the query parameter
        },
      });

      const extractedData = extractBookData(data.docs);
      res.json(extractedData);
  
    }catch(error){
      console.error("Error fetching search results:", error);
      res.status(500).send("Error fetching search results");
    }
  });
  
  const extractBookData = (docs) => {
    return docs.map((doc) => ({
      title: doc.title || null,
      isbn: doc.isbn || null,
      author_name: doc.author_name || null,
      first_publish_year: doc.first_publish_year || null,
      publish_year: doc.publish_year || null,
      publisher: doc.publisher || null,
      ratings_average: doc.ratings_average || null,
      first_sentence: doc.first_sentence || null,
      subject: doc.subject || null,
      subject_key: doc.subject_key || null,
    }));
  };


//*******************************
// Routes for writing to mongodb 
//*******************************
// create new bookshelf
app.post("/bookshelf/newbookshelf", async (req, res) =>{
    try{
        const { username, shelfname } = req.body;
        if (!username || !shelfname) {
            return res.status(400).json({ error: "Username and shelf name are required" });
        }

        // Check for duplicate combination of username and shelfname
        const existingBookshelf = await bookshelf.findOne({ username, shelfname });

        if (existingBookshelf) {
            return res.status(409).json({ error: `Bookshelf '${shelfname}' already exists for user '${username}'` });
        }
        const newBookshelf = {
            username : username,
            shelfname : shelfname
          };
          const result = await bookshelf.insertOne(newBookshelf);
          res.status(201).json("Bookshelf '"+ shelfname +"' created successfully: " + result);
      
    }catch (error){
        console.error(error);
        res.status(500).json({ error: "An error occurred creating bookshelf" });
            
    }
});

// add a book to a bookshelf
app.post("/bookshelf/addbook", async (req, res) => {
    try {
        const { username, shelfname, book } = req.body;

        // Validate input
        if (!username || !shelfname || !book) {
            return res.status(400).json({
                error: "Username, shelf name, and book information are required",
            });
        }

        const { title, author, isbn, publish_year } = book;

        // Validate book fields
        if (!title || !author || !isbn || !publish_year) {
            return res.status(400).json({
                error: "Book must have a title, author, isbn, and publish_year",
            });
        }

        // Check if the bookshelf exists
        const existingBookshelf = await bookshelf.findOne({ username, shelfname });

        if (!existingBookshelf) {
            return res.status(404).json({
                error: `Bookshelf '${shelfname}' for user '${username}' not found`,
            });
        }

        // Check if the book already exists in the bookshelf (by isbn)
        const bookExists = existingBookshelf.books?.some((b) => b.isbn === isbn);

        if (bookExists) {
            return res.status(409).json({
                error: `Book with ISBN '${isbn}' already exists in the bookshelf '${shelfname}'`,
            });
        }


        // Add the book to the bookshelf
        const result = await bookshelf.updateOne(
            { username, shelfname },
            { $push: { books: book } } // Append the book to the 'books' array
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({
                message: `Book '${title}' added to bookshelf '${shelfname}' for user '${username}'`,
            });
        } else {
            res.status(500).json({
                error: "An error occurred while adding the book",
            });
        }
    } catch (error) {
        console.error("Error adding book:", error);
        res.status(500).json({ error: "An error occurred while adding the book" });
    }
});

// remove a book from the bookshelf
app.delete("/bookshelf/removebook", async (req, res) => {
    try {
        const { username, shelfname, isbn } = req.body;

        // Validate input
        if (!username || !shelfname || !isbn) {
            return res.status(400).json({
                error: "Username, shelf name, and ISBN are required",
            });
        }

        // Check if the bookshelf exists
        const existingBookshelf = await bookshelf.findOne({ username, shelfname });

        if (!existingBookshelf) {
            return res.status(404).json({
                error: `Bookshelf '${shelfname}' for user '${username}' not found`,
            });
        }

        // Check if the book exists in the bookshelf (by ISBN)
        const bookExists = existingBookshelf.books?.find((b) => b.isbn === isbn);

        if (!bookExists) {
            return res.status(404).json({
                error: `Book with ISBN '${isbn}' not found in the bookshelf '${shelfname}'`,
            });
        }

        // Update the book to mark it as deleted
        const result = await bookshelf.updateOne(
            { username, shelfname, "books.isbn": isbn },
            { $set: { "books.$.isDeleted": true } } // Mark the book as deleted
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({
                message: `Book with ISBN '${isbn}' marked as deleted in bookshelf '${shelfname}' for user '${username}'`,
            });
        } else {
            res.status(500).json({
                error: "An error occurred while marking the book as deleted",
            });
        }
    } catch (error) {
        console.error("Error removing book:", error);
        res.status(500).json({ error: "An error occurred while removing the book" });
    }
});


// get all bookshelves and books for a given user, sort by bookshelf name, then by title
app.get("/bookshelf/getallbooks", async (req, res) => {
    try {
        const { username } = req.query;

        // Validate input
        if (!username) {
            return res.status(400).json({
                error: "Username is required",
            });
        }

        // Retrieve all bookshelves for the user
        const bookshelves = await bookshelf
            .find({ username })
            .project({ books: 1, shelfname: 1, _id: 0 }) // Project only necessary fields
            .toArray();

        if (bookshelves.length === 0) {
            return res.status(404).json({
                error: `No bookshelves found for user '${username}'`,
            });
        }

        // Flatten and filter active books, then sort
        const allBooks = bookshelves.flatMap((shelf) =>
            (shelf.books || [])
                .filter((book) => !book.isDeleted) // Exclude soft-deleted books
                .map((book) => ({
                    shelfname: shelf.shelfname,
                    title: book.title,
                    author: book.author,
                    isbn: book.isbn,
                    publish_year: book.publish_year,
                }))
        );

        // Sort by shelfname and then by title
        allBooks.sort((a, b) => {
            const shelfComparison = a.shelfname.localeCompare(b.shelfname);
            return shelfComparison !== 0 ? shelfComparison : a.title.localeCompare(b.title);
        });

        res.status(200).json({
            username,
            books: allBooks,
        });
    } catch (error) {
        console.error("Error retrieving books:", error);
        res.status(500).json({ error: "An error occurred while retrieving books" });
    }
});

// get books for specific username + shelfname, sort by title
app.get("/bookshelf/getbooks", async (req, res) => {
    try {
        const { username, shelfname } = req.query;

        // Validate input
        if (!username || !shelfname) {
            return res.status(400).json({
                error: "Username and shelf name are required",
            });
        }

        // Retrieve the bookshelf
        const existingBookshelf = await bookshelf.findOne({ username, shelfname });

        if (!existingBookshelf) {
            return res.status(404).json({
                error: `Bookshelf '${shelfname}' for user '${username}' not found`,
            });
        }

        // Filter out soft-deleted books (if using soft delete)
        const activeBooks = existingBookshelf.books?.filter(
            (book) => !book.isDeleted
        ) || [];

        // Sort books by title
        const sortedBooks = activeBooks.sort((a, b) => 
            a.title.localeCompare(b.title)
        );
        

        // Return the books
        res.status(200).json({
            username,
            shelfname,
            books: sortedBooks,
        });
    } catch (error) {
        console.error("Error retrieving books:", error);
        res.status(500).json({ error: "An error occurred while retrieving books" });
    }
});

// soft delete a bookshelf
app.delete("/bookshelf/deleteshelf", async (req, res) => {
    try {
        const { username, shelfname } = req.body;

        // Validate input
        if (!username || !shelfname) {
            return res.status(400).json({
                error: "Username and shelf name are required",
            });
        }

        // Find and update the bookshelf to mark it as deleted
        const result = await bookshelf.updateOne(
            { username, shelfname, isDeleted: { $ne: true } }, // Ensure it isn't already deleted
            { $set: { isDeleted: true } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: `Bookshelf '${shelfname}' for user '${username}' not found or already deleted`,
            });
        }

        res.status(200).json({
            message: `Bookshelf '${shelfname}' for user '${username}' marked as deleted successfully`,
        });
    } catch (error) {
        console.error("Error soft deleting bookshelf:", error);
        res.status(500).json({ error: "An error occurred while soft deleting the bookshelf" });
    }
});  

// add book review
app.post("/review/add", async (req, res) => {
    try {
        const { username, isbn, rating, review } = req.body;

        // Validate input
        if (!username || !isbn || typeof rating !== "number" || !review) {
            return res.status(400).json({
                error: "Username, ISBN, numeric rating, and review are required",
            });
        }

        // Check rating boundaries
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                error: "Rating must be a number between 1 and 5",
            });
        }

        // Check if the user exists
        const userExists = await users.findOne({ username });
        if (!userExists) {
            return res.status(404).json({
                error: `User '${username}' not found`,
            });
        }

        // Check if the review already exists
        const existingReview = await bookreview.findOne({ username, isbn });
        if (existingReview) {
            return res.status(409).json({
                error: `Review for ISBN '${isbn}' by user '${username}' already exists`,
            });
        }

        // Add the new review
        const newReview = {
            username,
            isbn,
            rating,
            review,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await bookreview.insertOne(newReview);

        res.status(201).json({
            message: "Review added successfully",
        });

    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ error: "An error occurred while adding the review" });
    }
});


// update book review created by a user for a specific book
app.put("/review/update", async (req, res) => {
    try {
        const { username, isbn, rating, review } = req.body;

        // Validate input
        if (!username || !isbn || typeof rating !== "number" || !review) {
            return res.status(400).json({
                error: "Username, ISBN, numeric rating, and review are required",
            });
        }

        // Check rating boundaries
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                error: "Rating must be a number between 1 and 5",
            });
        }

        // Check if the user exists
        const userExists = await users.findOne({ username });
        if (!userExists) {
            return res.status(404).json({
                error: `User '${username}' not found`,
            });
        }

        // Check if the review exists
        const existingReview = await bookreview.findOne({ username, isbn });
        if (!existingReview) {
            return res.status(404).json({
                error: `Review for ISBN '${isbn}' by user '${username}' not found`,
            });
        }

        // Update the review
        const result = await bookreview.updateOne(
            { username, isbn },
            { $set: { rating, review, updatedAt: new Date() } }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({
                message: `Review for ISBN '${isbn}' by user '${username}' updated successfully`,
            });
        } else {
            res.status(500).json({
                error: "An error occurred while updating the review",
            });
        }
    } catch (error) {
        console.error("Error updating review:", error);
        res.status(500).json({ error: "An error occurred while updating the review" });
    }
});

// get book review for a given isbn
app.get("/review/getreview", async (req, res) => {
    try {
        const { isbn } = req.query;

        // Validate input
        if (!isbn) {
            return res.status(400).json({
                error: "ISBN is required",
            });
        }

        // Retrieve reviews for the given ISBN, sorted by updatedAt in descending order
        const reviews = await bookreview
            .find({ isbn, isDeleted: { $ne: true } }) // Exclude soft-deleted reviews
            .sort({ updatedAt: -1 }) // Sort by updatedAt descending
            .toArray();

        if (reviews.length === 0) {
            return res.status(404).json({
                message: `No reviews found for ISBN '${isbn}'`,
            });
        }

        res.status(200).json({
            isbn,
            reviews,
        });
    } catch (error) {
        console.error("Error retrieving reviews:", error);
        res.status(500).json({ error: "An error occurred while retrieving reviews" });
    }
});


// delete user's own review for a specific isbn
app.delete("/review/delete", async (req, res) => {
    try {
        const { username, isbn } = req.body;

        // Validate input
        if (!username || !isbn) {
            return res.status(400).json({
                error: "Username and ISBN are required",
            });
        }

        // Check if the review exists
        const existingReview = await bookreview.findOne({ username, isbn });

        if (!existingReview) {
            return res.status(404).json({
                error: `Review for ISBN '${isbn}' by user '${username}' not found`,
            });
        }

        // Check if the review is already soft-deleted
        if (existingReview.isDeleted) {
            return res.status(409).json({
                error: `Review for ISBN '${isbn}' by user '${username}' is already marked as deleted`,
            });
        }

        // Mark the review as deleted
        const result = await bookreview.updateOne(
            { username, isbn },
            { $set: { isDeleted: true, updatedAt: new Date() } }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({
                message: `Review for ISBN '${isbn}' by user '${username}' marked as deleted successfully`,
            });
        } else {
            res.status(500).json({
                error: "An error occurred while marking the review as deleted",
            });
        }
    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({ error: "An error occurred while deleting the review" });
    }
});



// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
