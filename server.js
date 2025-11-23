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
    user_id: { type: String, required: true, unique: true }, // Добавляем поле user_id
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

        // Генерируем user_id в формате @username
        const user_id = `@${username}`;

        // Проверяем, не занят ли user_id
        const existingUserId = await User.findOne({ user_id });
        if (existingUserId) {
            return res.status(409).json({
                success: false,
                message: 'User ID already exists',
                field: 'user_id'
            });
        }

        // Создаем нового пользователя
        const user = new User({
            username,
            email,
            password, // В реальном приложении нужно хешировать!
            user_id, // Добавляем сгенерированный user_id
        });

        // Сохраняем в базу
        const savedUser = await user.save();

        // Возвращаем ответ без пароля
        const userResponse = {
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            user_id: savedUser.user_id, // Возвращаем user_id
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
            user_id: user.user_id,
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



// 🔄 ОБНОВЛЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ

// Обновление данных пользователя
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, user_id } = req.body;

        // Проверяем, существует ли пользователь
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Проверяем, что хотя бы одно поле для обновления передано
        if (!username && !email && !user_id) {
            return res.status(400).json({
                success: false,
                message: 'At least one field is required for update: username, email, or user_id'
            });
        }

        // Объект для обновления
        const updateFields = {};
        
        // Проверяем и добавляем поля для обновления
        if (username && username !== existingUser.username) {
            // Проверяем, не занят ли новый username другим пользователем
            const usernameExists = await User.findOne({ 
                username, 
                _id: { $ne: id } // Исключаем текущего пользователя
            });
            
            if (usernameExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Username already taken',
                    field: 'username'
                });
            }
            updateFields.username = username;
        }

        if (email && email !== existingUser.email) {
            // Проверяем, не занят ли новый email другим пользователем
            const emailExists = await User.findOne({ 
                email, 
                _id: { $ne: id } 
            });
            
            if (emailExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already taken',
                    field: 'email'
                });
            }
            updateFields.email = email;
        }

        if (user_id && user_id !== existingUser.user_id) {
            // Проверяем формат user_id (должен начинаться с @)
            if (!user_id.startsWith('@')) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID must start with @',
                    field: 'user_id'
                });
            }

            // Проверяем, не занят ли новый user_id другим пользователем
            const userIdExists = await User.findOne({ 
                user_id, 
                _id: { $ne: id } 
            });
            
            if (userIdExists) {
                return res.status(409).json({
                    success: false,
                    message: 'User ID already taken',
                    field: 'user_id'
                });
            }
            updateFields.user_id = user_id;
        }

        // Если нет полей для обновления (все значения совпадают с текущими)
        if (Object.keys(updateFields).length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No changes detected',
                data: {
                    id: existingUser._id,
                    username: existingUser.username,
                    email: existingUser.email,
                    user_id: existingUser.user_id,
                    createdAt: existingUser.createdAt
                }
            });
        }

        // Обновляем пользователя
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true } // Возвращаем обновленный документ и запускаем валидацию
        );

        // Формируем ответ без пароля
        const userResponse = {
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            user_id: updatedUser.user_id,
            createdAt: updatedUser.createdAt
        };

        res.json({
            success: true,
            message: 'User updated successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('Update user error:', error);
        
        // Обработка ошибок валидации Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message
            });
        }
        
        // Обработка ошибок CastError (неверный ID)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating user',
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