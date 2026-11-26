const pickDefined = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
};

const mapUser = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    username: row.username ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    password: row.password ?? undefined,
    googleId: row.google_id ?? undefined,
    xId: row.x_id ?? undefined,
    supabaseUid: row.supabase_uid ?? undefined,
    profilePicture: row.profile_picture ?? undefined,
    coins: Number(row.coins ?? 0),
    role: row.role || "user",
    bookedTickets: Array.isArray(row.booked_tickets) ? row.booked_tickets : [],
    resetCodeHash: row.reset_code_hash ?? undefined,
    resetCodeExpires: row.reset_code_expires ?? undefined,
    resetPasswordToken: row.reset_password_token ?? undefined,
    resetPasswordExpires: row.reset_password_expires ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const u = user._id ? { ...user } : mapUser(user);
  delete u.password;
  delete u.resetCodeHash;
  delete u.resetCodeExpires;
  delete u.resetPasswordToken;
  delete u.resetPasswordExpires;
  return u;
};

const toUserRow = (input = {}) =>
  pickDefined({
    name: input.name,
    username:
      input.username !== undefined
        ? input.username
          ? String(input.username).trim().toLowerCase()
          : null
        : undefined,
    email:
      input.email !== undefined
        ? input.email
          ? String(input.email).trim().toLowerCase()
          : null
        : undefined,
    phone: input.phone !== undefined ? input.phone || null : undefined,
    password: input.password,
    google_id: input.googleId,
    x_id: input.xId,
    supabase_uid: input.supabaseUid,
    profile_picture: input.profilePicture,
    coins: input.coins,
    role: input.role,
    booked_tickets: input.bookedTickets,
    reset_code_hash: input.resetCodeHash,
    reset_code_expires: input.resetCodeExpires,
    reset_password_token: input.resetPasswordToken,
    reset_password_expires: input.resetPasswordExpires,
  });

const mapMovieTeam = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password ?? undefined,
    secretKeyHash: row.secret_key_hash ?? undefined,
    secretKeyDigest: row.secret_key_digest ?? undefined,
    secretKeyHint: row.secret_key_hint ?? undefined,
    secretKey: row.secret_key ?? undefined,
    assignedMovies: Array.isArray(row.assigned_movies)
      ? row.assigned_movies
      : [],
    freeTicketsCount: Number(row.free_tickets_count ?? 0),
    resetCodeHash: row.reset_code_hash ?? undefined,
    resetCodeExpires: row.reset_code_expires ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toMovieTeamRow = (input = {}) =>
  pickDefined({
    name: input.name,
    email:
      input.email !== undefined
        ? String(input.email).trim().toLowerCase()
        : undefined,
    password: input.password,
    secret_key_hash: input.secretKeyHash,
    secret_key_digest: input.secretKeyDigest,
    secret_key_hint: input.secretKeyHint,
    secret_key: input.secretKey,
    assigned_movies: input.assignedMovies,
    free_tickets_count: input.freeTicketsCount,
    reset_code_hash: input.resetCodeHash,
    reset_code_expires: input.resetCodeExpires,
  });

const mapMovie = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    customId: row.custom_id,
    title: row.title,
    tagline: row.tagline || "",
    overview: row.overview,
    mediaType: row.media_type || "movie",
    releaseDate: row.release_date || "",
    year: row.year || "",
    runtime: Number(row.runtime ?? 145),
    certification: row.certification || "UA 13+",
    director: row.director || "Featured Director",
    language: row.language || "English",
    originalLanguage: row.original_language || "en",
    genres: Array.isArray(row.genres) ? row.genres : [],
    quality: row.quality || "IMAX 4K",
    country: row.country || "IN",
    currencyCode: row.currency_code || "INR",
    currencySymbol: row.currency_symbol || "₹",
    totalBudget: Number(row.total_budget ?? 0),
    totalCollections: Number(row.total_collections ?? 0),
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url || "",
    galleryPhotos: Array.isArray(row.gallery_photos) ? row.gallery_photos : [],
    cast: Array.isArray(row.cast_members) ? row.cast_members : [],
    trailerUrl: row.trailer_url || "",
    trailerKey: row.trailer_key || "",
    ticketPricing: row.ticket_pricing || {
      classic: 240,
      grand: 360,
      majestic: 540,
    },
    theatres: Array.isArray(row.theatres) ? row.theatres : [],
    paymentConfig: row.payment_config || {
      upi: true,
      card: true,
      wallets: true,
      netBanking: true,
      coinsRedeemable: true,
      rewardCoinsPerSeat: 25,
    },
    rating: Number(row.rating ?? 8.5),
    isPublished: row.is_published !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toMovieRow = (input = {}) =>
  pickDefined({
    custom_id: input.customId,
    title: input.title,
    tagline: input.tagline,
    overview: input.overview,
    media_type: input.mediaType,
    release_date: input.releaseDate,
    year: input.year,
    runtime: input.runtime,
    certification: input.certification,
    director: input.director,
    language: input.language,
    original_language: input.originalLanguage,
    genres: input.genres,
    quality: input.quality,
    country: input.country,
    currency_code: input.currencyCode,
    currency_symbol: input.currencySymbol,
    total_budget: input.totalBudget,
    total_collections: input.totalCollections,
    poster_url: input.posterUrl,
    backdrop_url: input.backdropUrl,
    gallery_photos: input.galleryPhotos,
    cast_members: input.cast,
    trailer_url: input.trailerUrl,
    trailer_key: input.trailerKey,
    ticket_pricing: input.ticketPricing,
    theatres: input.theatres,
    payment_config: input.paymentConfig,
    rating: input.rating,
    is_published: input.isPublished,
  });

const mapTicket = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    movieId: row.movie_id,
    movieTitle: row.movie_title ?? undefined,
    theatre: row.theatre,
    city: row.city ?? undefined,
    languageFormat: row.language_format ?? undefined,
    seatNumber: row.seat_number,
    date: row.date,
    time: row.time,
    showtimeEnd: row.showtime_end ?? undefined,
    reviewSubmitted: Boolean(row.review_submitted),
    reviewNotificationSent: Boolean(row.review_notification_sent),
    price: Number(row.price ?? 0),
    snacksTotal: Number(row.snacks_total ?? 0),
    snacksSummary: row.snacks_summary || "",
    convenienceFee: Number(row.convenience_fee ?? 0),
    paymentMethod: row.payment_method || "Razorpay",
    razorpayPaymentId: row.razorpay_payment_id ?? undefined,
    razorpayOrderId: row.razorpay_order_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toTicketRow = (input = {}) =>
  pickDefined({
    user_id: input.userId,
    movie_id: input.movieId,
    movie_title: input.movieTitle,
    theatre: input.theatre,
    city: input.city,
    language_format: input.languageFormat,
    seat_number: input.seatNumber,
    date: input.date,
    time: input.time,
    showtime_end: input.showtimeEnd,
    review_submitted: input.reviewSubmitted,
    review_notification_sent: input.reviewNotificationSent,
    price: input.price,
    snacks_total: input.snacksTotal,
    snacks_summary: input.snacksSummary,
    convenience_fee: input.convenienceFee,
    payment_method: input.paymentMethod,
    razorpay_payment_id: input.razorpayPaymentId,
    razorpay_order_id: input.razorpayOrderId,
  });

const mapReview = (row, joinedUser = null) => {
  if (!row) return null;
  const userObj = joinedUser || row.user || row.users || null;
  return {
    _id: row.id,
    id: row.id,
    userId: userObj
      ? {
          _id: userObj.id || row.user_id,
          id: userObj.id || row.user_id,
          name: userObj.name,
          profilePicture: userObj.profile_picture ?? userObj.profilePicture,
        }
      : row.user_id ?? undefined,
    authorName: row.author_name ?? undefined,
    movieId: row.movie_id,
    rating: Number(row.rating ?? 0),
    comment: row.comment ?? undefined,
    aiScore: Number(row.ai_score ?? 0),
    aiTags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
    aiSummary: row.ai_summary || "",
    isWinner: Boolean(row.is_winner),
    isVerifiedTicket: Boolean(row.is_verified_ticket),
    commentType: row.comment_type || "review",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toReviewRow = (input = {}) =>
  pickDefined({
    user_id: input.userId,
    author_name: input.authorName,
    movie_id: input.movieId,
    rating: input.rating,
    comment: input.comment,
    ai_score: input.aiScore,
    ai_tags: input.aiTags,
    ai_summary: input.aiSummary,
    is_winner: input.isWinner,
    is_verified_ticket: input.isVerifiedTicket,
    comment_type: input.commentType,
  });

const mapPartnerRequest = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone,
    eventType: row.event_type,
    budget: Number(row.budget ?? 0),
    description: row.description ?? undefined,
    eventDate: row.event_date ?? undefined,
    eventLocation: row.event_location ?? undefined,
    locationUrl: row.location_url ?? undefined,
    status: row.status || "Pending",
    paymentCode: row.payment_code ?? undefined,
    paymentAmount:
      row.payment_amount !== null && row.payment_amount !== undefined
        ? Number(row.payment_amount)
        : undefined,
    paymentStatus: row.payment_status || "Unpaid",
    paidAt: row.paid_at ?? undefined,
    razorpayPaymentId: row.razorpay_payment_id ?? undefined,
    adminMessage: row.admin_message ?? undefined,
    rejectReason: row.reject_reason ?? undefined,
    messages: Array.isArray(row.messages) ? row.messages : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toPartnerRequestRow = (input = {}) =>
  pickDefined({
    user_id: input.userId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    event_type: input.eventType,
    budget: input.budget,
    description: input.description,
    event_date: input.eventDate,
    event_location: input.eventLocation,
    location_url: input.locationUrl,
    status: input.status,
    payment_code: input.paymentCode,
    payment_amount: input.paymentAmount,
    payment_status: input.paymentStatus,
    paid_at: input.paidAt,
    razorpay_payment_id: input.razorpayPaymentId,
    admin_message: input.adminMessage,
    reject_reason: input.rejectReason,
    messages: input.messages,
  });

module.exports = {
  mapUser,
  sanitizeUser,
  toUserRow,
  mapMovieTeam,
  toMovieTeamRow,
  mapMovie,
  toMovieRow,
  mapTicket,
  toTicketRow,
  mapReview,
  toReviewRow,
  mapPartnerRequest,
  toPartnerRequestRow,
};

