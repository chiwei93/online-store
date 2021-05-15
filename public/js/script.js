const btnToggle = document.querySelector('.nav__btn-toggle');
const navbar = document.querySelector('.nav__list');
const ratingList = document.querySelector('.review__rating--list');
const ratingRadioBtns = document.querySelectorAll('.rating__radio--btn');
const alertPopUp = document.querySelector('.alert');
const fileUploadInput = document.querySelector('.form__input--file');
const imageOverview = document.querySelector('.form__image--overview');
const cartItemsList = document.querySelector('.cart__list');
const cartTotalPrice = document.querySelector('.cart__checkout__price--text');
const navCartBtn = document.querySelector('.nav__link--cart');
const categoryList = document.querySelector('.category--list');

//for toggle btn of navigation
if (btnToggle) {
  btnToggle.addEventListener('click', () => {
    btnToggle.classList.toggle('active');
    navbar.classList.toggle('active');
  });
}

const radioBtnEventHandler = e => {
  const radioBtn = e.target.closest('.rating__radio--btn');

  //check if the radio btn is clicked
  if (!radioBtn) return;

  //remove the active class for all the radio btn
  ratingRadioBtns.forEach(btn => {
    btn.classList.remove('active');
  });

  //add the active class to the appropriate radio btn
  radioBtn.classList.add('active');
};

//for rating radio btn for the review form
if (ratingList) {
  ratingList.addEventListener('click', radioBtnEventHandler);
}

//for category radio btn for the add product form
if (categoryList) {
  categoryList.addEventListener('click', radioBtnEventHandler);
}

//for alert popup
if (alertPopUp) {
  //set timeout to remove the active class of the pop up
  setTimeout(() => {
    alertPopUp.classList.remove('active');
  }, 3000);
}

//for live preview of the image upload
if (fileUploadInput) {
  fileUploadInput.addEventListener('change', e => {
    //create a url for the file
    const url = URL.createObjectURL(e.target.files[0]);

    //create a img element
    const img = document.createElement('img');

    //set the src to the url created
    img.src = url;

    //empty the overview
    imageOverview.innerHTML = '';

    //append the img element to the overview
    imageOverview.appendChild(img);
  });
}

//for handling the plus and minus btn (frontend) on the your cart page
if (cartItemsList) {
  cartItemsList.addEventListener('click', e => {
    //select dom elements
    const btn = e.target.closest('.cart__btn');
    const plusBtn = e.target.closest('.cart__btn--plus');
    const parentCartItem = btn.closest('.cart__item');
    const productQuantity = parentCartItem.querySelector(
      '.cart__product--quantity'
    );
    const productPrice = parentCartItem.querySelector('.cart__product--price');
    const navCartNumber = navCartBtn.querySelector('.cart-number');
    const csrfToken = parentCartItem.querySelector('[name=_csrf]').value;
    const productId = parentCartItem.querySelector('[name=productId]').value;

    //check if the plus or the minus btn is clicked
    if (!btn || btn.disabled) return;

    let url;

    //set the correct url according to which btn is clicked
    if (plusBtn) {
      url = `/add-product-quantity/${productId}`;
    } else {
      url = `/minus-product-quantity/${productId}`;
    }

    //send a post request to the server
    fetch(url, {
      method: 'POST',
      headers: {
        'csrf-token': csrfToken,
      },
    })
      .then(response => response.json())
      .then(data => {
        const cartItems = data.cart.items;

        //find the correct product
        const product = cartItems.find(
          item => item.productId._id === productId
        );

        //change the content of the appropriate dom elements
        productQuantity.textContent = product.quantity;

        productPrice.textContent = `RM ${
          product.productId.price * product.quantity
        }`;

        let totalSum = 0;
        let totalNumberCartItems = 0;

        cartItems.forEach(item => {
          totalSum += item.productId.price * item.quantity;
          totalNumberCartItems += item.quantity;
        });

        cartTotalPrice.textContent = `RM ${totalSum}`;

        navCartNumber.textContent = totalNumberCartItems;

        //select the minusBtn
        const minusBtn = e.target
          .closest('.cart__btn--list')
          .querySelector('.cart__btn--minus');

        const btnPlus = e.target
          .closest('.cart__btn--list')
          .querySelector('.cart__btn--plus');

        //disabled the minus button when the quantity is 1
        if (+productQuantity.textContent === 1) {
          minusBtn.disabled = true;
          minusBtn.classList.add('disabled');

          //disabled the plus button when the quantity reaches the max quantity
        } else if (
          +productQuantity.textContent === +product.productId.quantity
        ) {
          btnPlus.disabled = true;
          btnPlus.classList.add('disabled');
        } else {
          minusBtn.disabled = false;
          minusBtn.classList.remove('disabled');
          btnPlus.disabled = false;
          btnPlus.classList.remove('disabled');
        }
      })
      .catch(err => console.log(err));
  });
}
