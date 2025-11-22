import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Scrollbar } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import "tippy.js/dist/tippy.css";
import { bidsData } from "../../data/bids_data";
import Link from "next/link";
import Tippy from "@tippyjs/react";
import { MdKeyboardArrowRight, MdKeyboardArrowLeft } from "react-icons/md";
import { bidsModalShow } from "../../redux/counterSlice";
import { getListNFTProfile } from "@/services/profileService";
import { useEffect, useState } from "react";
import { useRouter } from "next-intl/client";

// profiles là array chứa thông tin các profile NFT đã mint
const BidsCarousel = () => {
  const [profiles, setProfiles] = useState([]);
  const { push } = useRouter();
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const profiles = await getListNFTProfile(10);
    console.log("Fetched profiles:", profiles);
    const listProfile = profiles.map((profile) => ({
      id: profile?.data.objectId,
      name: profile.data.display?.data?.name,
      image_url: profile.data.display?.data?.image_url,
      description: profile.data.display?.data?.description,
      digest: profile?.data.digest,
    }));

    setProfiles(listProfile);
  };

  return (
    <>
      <Swiper
        modules={[Navigation, Pagination, Scrollbar]}
        spaceBetween={30}
        slidesPerView="auto"
        loop={true}
        breakpoints={{
          240: {
            slidesPerView: 1,
          },
          565: {
            slidesPerView: 2,
          },
          1000: {
            slidesPerView: 3,
          },
          1100: {
            slidesPerView: 4,
          },
        }}
        navigation={{
          nextEl: ".bids-swiper-button-next",
          prevEl: ".bids-swiper-button-prev",
        }}
        className=" card-slider-4-columns !py-5"
      >
        {profiles.map((item) => {
          return (
            <SwiperSlide className="text-white" key={item?.id}>
              <article>
                <div className="dark:bg-jacarta-700 dark:border-jacarta-700 border-jacarta-100 rounded-2xl block border bg-white p-[1.1875rem] transition-shadow hover:shadow-lg text-jacarta-500">
                  <figure>
                    {/* {`item/${itemLink}`} */}

                    <a>
                      <div className="w-full">
                        <Image
                          src={item?.image_url}
                          alt={item?.name}
                          height={230}
                          width={230}
                          layout="responsive"
                          objectFit="cover"
                          className="rounded-[0.625rem] w-full"
                          loading="lazy"
                        />
                      </div>
                    </a>
                  </figure>
                  <div className="mt-4 flex items-center justify-between">
                    <a onClick={() => push(`user-profile/${item?.id}`)}>
                      <span className="font-display text-jacarta-700 hover:text-accent text-base dark:text-white">
                        {item?.name}
                      </span>
                    </a>

                    <span className="dark:border-jacarta-600 border-jacarta-100 flex items-center whitespace-nowrap rounded-md border py-1 px-2">
                      <Tippy content={<span>SUI</span>}>
                        <svg
                          className=" w-4 h-4 "
                          viewBox="0 0 300 384"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M240.057 159.914C255.698 179.553 265.052 204.39 265.052 231.407C265.052 258.424 255.414 284.019 239.362 303.768L237.971 305.475L237.608 303.31C237.292 301.477 236.929 299.613 236.502 297.749C228.46 262.421 202.265 232.134 159.148 207.597C130.029 191.071 113.361 171.195 108.985 148.586C106.157 133.972 108.258 119.294 112.318 106.717C116.379 94.1569 122.414 83.6187 127.549 77.2831L144.328 56.7754C147.267 53.1731 152.781 53.1731 155.719 56.7754L240.073 159.914H240.057ZM266.584 139.422L154.155 1.96703C152.007 -0.655678 147.993 -0.655678 145.845 1.96703L33.4316 139.422L33.0683 139.881C12.3868 165.555 0 198.181 0 233.698C0 316.408 67.1635 383.461 150 383.461C232.837 383.461 300 316.408 300 233.698C300 198.181 287.613 165.555 266.932 139.896L266.568 139.438L266.584 139.422ZM60.3381 159.472L70.3866 147.164L70.6868 149.439C70.9237 151.24 71.2239 153.041 71.5715 154.858C78.0809 189.001 101.322 217.456 140.173 239.496C173.952 258.724 193.622 280.828 199.278 305.064C201.648 315.176 202.059 325.129 201.032 333.835L200.969 334.372L200.479 334.609C185.233 342.05 168.09 346.237 149.984 346.237C86.4546 346.237 34.9484 294.826 34.9484 231.391C34.9484 204.153 44.4439 179.142 60.3065 159.44L60.3381 159.472Z"
                            fill="#4DA2FF"
                          />
                        </svg>
                      </Tippy>

                      <span className="text-green text-sm font-medium tracking-tight">
                        {item?.eth_number} SUI
                      </span>
                    </span>
                  </div>
                  <div className=" text-sm line-clamp-2 flex items-center justify-between">
                    <span>{item?.description}</span>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <button
                      type="button"
                      className="text-accent font-display text-sm font-semibold"
                      onClick={() => push(`user-profile/${item?.id}`)}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>
      {/* <!-- Slider Navigation --> */}
      <div className="group bids-swiper-button-prev swiper-button-prev shadow-white-volume absolute !top-1/2 !-left-4 z-10 -mt-6 flex !h-12 !w-12 cursor-pointer items-center justify-center rounded-full bg-white p-3 text-jacarta-700 text-xl sm:!-left-6 after:hidden">
        <MdKeyboardArrowLeft />
      </div>
      <div className="group bids-swiper-button-next swiper-button-next shadow-white-volume absolute !top-1/2 !-right-4 z-10 -mt-6 flex !h-12 !w-12 cursor-pointer items-center justify-center rounded-full bg-white p-3 text-jacarta-700 text-xl sm:!-right-6 after:hidden">
        <MdKeyboardArrowRight />
      </div>
    </>
  );
};

export default BidsCarousel;
