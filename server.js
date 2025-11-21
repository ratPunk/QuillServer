const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
// const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/quilldb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('📦 Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Модель пользователя
const User = mongoose.model('User', {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// API routes
app.get('/', (req, res) => {
    res.json({ message: 'book from quill' });
});

// 🔐 АУТЕНТИФИКАЦИЯ

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Проверка обязательных полей
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: username, email, password'
            });
        }

        // Проверяем, существует ли пользователь
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
                field: existingUser.email === email ? 'email' : 'username'
            });
        }

        // const hashedPassword = password;

        // Создаем нового пользователя
        const user = new User({
            username,
            email,
            password, // В реальном приложении нужно хешировать!
        });

        // Сохраняем в базу
        const savedUser = await user.save();

        // Возвращаем ответ без пароля
        const userResponse = {
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            createdAt: savedUser.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});


// 🔐 АВТОРИЗАЦИЯ пользователя
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Проверка обязательных полей
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        console.log('🔐 Login attempt for email:', email);

        // Ищем пользователя по email
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log('✅ User found:', user.username);

        // 🔐 ПРОВЕРКА ПАРОЛЯ
        // Временная версия без хеширования (для тестов)
        if (user.password !== password) {
            console.log('❌ Invalid password for user:', user.username);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 🔐 ВЕРСИЯ С ХЕШИРОВАНИЕМ (раскомментируйте когда будет готово)
        // const isPasswordValid = await bcrypt.compare(password, user.password);
        // if (!isPasswordValid) {
        //     console.log('❌ Invalid password for user:', user.username);
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Invalid email or password'
        //     });
        // }

        // Успешная авторизация
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
        };

        console.log('✅ Login successful for user:', user.username);

        res.json({
            success: true,
            message: 'Login successful',
            data: userResponse
        });

    } catch (error) {
        console.error('💥 Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});



// =============== GENRES API ===============
const genreSchema = new mongoose.Schema({
    name: String,
});

const Genre = mongoose.model('Genre', genreSchema);

app.get('/api/genres', async (req, res) => {
    try {
        const genres = await Genre.find({});
        
        res.json({
            success: true,
            data: genres,
            count: genres.length,
            message: 'Genres retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});



// =============== BOOKS API ===============
const bookSchema = new mongoose.Schema({
    name: String,
    author: String,
    year: Number,
    file_path: String
});

const Book = mongoose.model('Book', bookSchema);

app.get('/api/books', async (req, res) => {
    const { id, search, genres, sortBy, sortOrder } = req.query;

    try {
        let pipeline = [];

        // Если есть ID, добавляем match в начало
        if (id) {
            pipeline.push({
                $match: { _id: new mongoose.Types.ObjectId(id) }
            });
        }

        // Если есть поиск по тексту
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { author: { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        // Базовый пайплайн для получения книг с жанрами и рейтингами
        pipeline.push(
            {
                $lookup: {
                    from: "book_genres",
                    localField: "_id",
                    foreignField: "book_id",
                    as: "book_genres"
                }
            },
            {
                $lookup: {
                    from: "genres",
                    localField: "book_genres.genre_id",
                    foreignField: "_id",
                    as: "genres"
                }
            },
            {
                $lookup: {
                    from: "book_ratings",
                    localField: "_id",
                    foreignField: "book_id",
                    as: "ratings"
                }
            }
        );

        // Если есть фильтр по жанрам
        if (genres) {
            const genreIds = Array.isArray(genres) ? genres : [genres];
            const objectIdGenres = genreIds.map(id => new mongoose.Types.ObjectId(id));
            
            pipeline.push({
                $match: {
                    "genres._id": { $in: objectIdGenres }
                }
            });
        }

        // Финальные стадии пайплайна
        pipeline.push(
            {
                $project: {
                    _id: 1,
                    name: 1,
                    author: 1,
                    year: 1,
                    file_path: 1,
                    genres: {
                        $map: {
                            input: "$genres",
                            as: "genre",
                            in: {
                                _id: "$$genre._id",
                                name: "$$genre.name"
                            }
                        }
                    },
                    average_rating: { 
                        $cond: {
                            if: { $gt: [{ $size: "$ratings" }, 0] },
                            then: { $round: [{ $avg: "$ratings.rating" }, 1] },
                            else: 0
                        }
                    },
                    ratings_count: { $size: "$ratings" }
                }
            }
        );

        // Добавляем сортировку если указана
        if (sortBy) {
            let sortField;
            
            // Определяем поле для сортировки
            switch (sortBy) {
                case 'title':
                    sortField = 'name';
                    break;
                case 'author':
                    sortField = 'author';
                    break;
                case 'rating':
                    sortField = 'average_rating';
                    break;
                case 'publication-year':
                    sortField = 'year';
                    break;
                default:
                    sortField = 'name';
            }

            // Определяем направление сортировки
            const sortDirection = sortOrder === 'desc' ? -1 : 1;

            // Добавляем сортировку в пайплайн
            pipeline.push({
                $sort: { [sortField]: sortDirection }
            });
        }

        const books = await Book.aggregate(pipeline);

        if (id && books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        const resultData = id ? books[0] : books;

        let message = 'Books retrieved successfully';
        if (id) {
            message = 'Book retrieved successfully';
        } else if (search && genres) {
            message = `Найдено ${books.length} книг по запросу "${search}" с выбранными жанрами`;
        } else if (search) {
            message = `Найдено ${books.length} книг по запросу "${search}"`;
        } else if (genres) {
            message = `Найдено ${books.length} книг с выбранными жанрами`;
        } else if (sortBy) {
            const sortFieldNames = {
                'title': 'названию',
                'author': 'автору', 
                'rating': 'рейтингу',
                'publication-year': 'году издания'
            };
            const order = sortOrder === 'desc' ? 'убыванию' : 'возрастанию';
            message = `Книги отсортированы по ${sortFieldNames[sortBy]} в порядке ${order}`;
        }

        res.json({
            success: true,
            data: resultData,
            count: books.length,
            message: message
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Quill Server started on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
});