import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [stock, setStock] = useState<Stock[]>([]);

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    const getStockProducts = async () => {
      const { data } = await api.get("/stock");
      setStock(data);
    };
    getStockProducts();
  }, []);

  const handleUpdateLocalStorageCart = (newCart: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
  };

  useEffect(() => handleUpdateLocalStorageCart(cart), [cart]);

  const addProduct = async (productId: number) => {
    const productInStock = stock.find((product) => product.id === productId);
    const productInCart = cart.find((product) => product.id === productId);

    try {
      if (productInCart) {
        console.log("product in cart:", productInCart);

        if (!productInStock || productInStock.amount <= productInCart.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        productInCart.amount += 1;

        setCart(
          cart.map((product) =>
            product.id === productId ? productInCart : product
          )
        );
      } else {
        console.log("adding product that was not in the cart");
        const { data: newProduct } = await api.get(`/products/${productId}`);
        console.log("product fetched:", newProduct);
        const newCart = [...cart, { ...newProduct, amount: 1 }];
        setCart(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const productInStock = stock.find((product) => product.id === productId);
    if (!productInStock || amount <= 0) return;

    if (productInStock.amount < amount) {
      toast.error("Quantidade solicitada fora de estoque");
      return;
    }

    try {
      const itemToUpdate = cart.find(
        (elem) => elem.id === productId
      ) as Product;
      itemToUpdate.amount = amount;
      setCart(
        cart.map((elem) => (elem.id === productId ? itemToUpdate : elem))
      );
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
